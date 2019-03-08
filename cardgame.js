const MAX_PROPERTIES = 5;
const MAX_CARDS = 32;
const API_URL = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=`;

let statusField = undefined;
let typeLabel = undefined;

function setStatus(text) {
    statusField.innerHTML = text;
}

function runQuery(query, callback) {
    window.fetch(API_URL+query).then(
        function (response) {
            if (response.status !== 200) {
                setStatus(`The query took too long or failed. This is probably a bug, let us know! (Status code: ${response.status})`);
                return;
            }
            response.json().then(function (data) {
                callback(data.results.bindings);
            });
        }
    ).catch(function (err) {
        setStatus('An error occurred while running the query: "'+err+'"');
    });
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function ordinal(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

// input format: 1772-01-01T00:00:00Z
function formatDate(date, precision) {
    if (precision >= 11) {
        return date.substring(0, 10);
    } else if (precision == 10) {
        return date.substring(0, 7);
    } else if (precision == 9) {
        return date.substring(0, 4);
    } else if (precision == 8) {
        return date.substring(0, 3)+"0s";
    } else if (precision == 7) {
        return ordinal(parseInt(date.substring(0, 2))+1)+" century";
    } else {
        return "a long time ago";
    }
}

function number_format(number, decimals, dec_point, thousands_sep) {
    // By Jonas Raoni Soares Silva, Kevin van Zonneveld, and others
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        toFixedFix = function (n, prec) {
            // Fix for IE parseFloat(0.55).toFixed(0) = 0;
            var k = Math.pow(10, prec);
            return Math.round(n * k) / k;
        },
        s = (prec ? toFixedFix(n, prec) : Math.round(n)).toString().split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

function unitSimplify(text){
    text = text.replace(' per ','/');

    text = text.replace('kilogram','kg');
    text = text.replace('gram','g');

    text = text.replace('cubic metre','m^3');
    text = text.replace('square metre','m^2');
    text = text.replace('centimetre','cm');
    text = text.replace('square kilometre','km^2');
    text = text.replace('kilometre','km');
    text = text.replace('metre','m');

    text = text.replace('astronomical unit','au');

    return text;
}

function buildDeck(results) {
    // Step 1: Get good property candidates.
    let propertiesCount = {};
    for (let line of results) {
        if (line.property.value in propertiesCount) {
            propertiesCount[line.property.value].items.push(line.item.value);
        } else {
            propertiesCount[line.property.value] = {items: [line.item.value], id: line.property.value, label: line.propLabel.value};
        }
    }

    let propertiesSorted = [];

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    for (const property in propertiesCount) {
        propertiesSorted.push([property, propertiesCount[property].items.filter(onlyUnique).length, propertiesCount[property].label]);
    }

    propertiesSorted = propertiesSorted.sort((a,b) => b[1] - a[1]);
    //propertiesSorted = propertiesSorted.sort((a,b) => Math.random()+0.01);

    propertiesSorted = propertiesSorted.slice(0, MAX_PROPERTIES);

    // Step 2: Get items which as many of these properties as possible.
    let items = {};

    for (let line of results) {
        let valid = false;
        for (let property of propertiesSorted) {
            if (property[0] == line.property.value) {
                valid = true;
            }
        }

        if (valid) {
            let value = ""

            if (line.precision) {
                value = formatDate(line.valueLabel.value, line.precision.value);
            } else {
                let decimals = (Math.round(line.valueLabel.value) == +line.valueLabel.value) ? 0 : 2;
                value = number_format(line.valueLabel.value, decimals, ".", " ");
                if (line.unitLabel && line.unitLabel.value != "1") {
                    value += " "+unitSimplify(line.unitLabel.value); 
                }
            }
            if (line.item.value in items) {
            } else {
                items[line.item.value] = {item: line.item.value, label: line.itemLabel.value, properties: {}};
                if (line.image) {
                    items[line.item.value].image = line.image.value.replace('http://', 'https://');
                }else{
                    items[line.item.value].image = 'texture.png';
                }
                if (line.itemDescription) {
                    items[line.item.value].description = line.itemDescription.value;
                }
            }
            items[line.item.value].properties[line.propLabel.value] = {property: line.propLabel.value, value: value};
        }
    }

    let it = [];
    for (let item in items) {
        let i = items[item];
        i.known_properties = Object.keys(i.properties).length;

        let props = [];

        for (let property of propertiesSorted) {
            if (property[2] in i.properties) {
            } else {
                i.properties[property[2]] = {property: property[2], value: "-"};
            }
            props.push(i.properties[property[2]]);
        }

        i.properties = props;
        it.push(i);
    }

    it.sort((a,b) => b.known_properties - a.known_properties);
    it = it.slice(0, MAX_CARDS);

    return it;
}

function runDataQuery(restriction) {
    let query = `
    SELECT ?item ?itemLabel ?itemDescription ?image ?property ?propLabel ?valueLabel ?unitLabel ?precision WITH {
      SELECT DISTINCT ?item WHERE {
        ${restriction}
        ?item wikibase:statements ?statements.
      }
      ORDER BY DESC(?statements)
      LIMIT 100
    } AS %items
    WHERE {
      INCLUDE %items.

      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en,de". }

      OPTIONAL { ?item wdt:P18 ?image. }

      ?item ?p ?statement.
      ?statement a wikibase:BestRank.

      ?property rdfs:label ?propLabel.
      ?property wikibase:claim ?p.
      ?property rdf:type wikibase:Property .

      FILTER (lang(?propLabel) = 'en' ).

      {
        ?property wikibase:propertyType wikibase:Quantity.

        ?statement ?psn ?valueNode.
        ?valueNode wikibase:quantityAmount ?value.
        ?valueNode wikibase:quantityUnit ?unit.

        ?property wikibase:statementValue ?psn.
      } UNION {
        ?property wikibase:propertyType wikibase:Time.

        ?statement ?psn ?valueNode.
        ?valueNode wikibase:timeValue ?value.
        ?valueNode wikibase:timePrecision ?precision.

        ?property wikibase:statementValue ?psn.
      }
    }
    `;

    query = query.replace(/%/g, "%25");

    runQuery(query, results => {
        var deck = buildDeck(results);

        for (let card of deck) {
            genCardHTML(card);
        }

        statusField.innerHTML = "Here's your <strong>"+typeLabel+"</strong> card game, consisting of "+deck.length+" cards. <a href=\"javascript:window.print()\" class=\"button\">Print them?</a>";
    });
}

function limitData(type) {
    var restriction = "?item wdt:P31?/wdt:P279* wd:"+type+".";
    runDataQuery(restriction);
}

function genCardHTML(data){
    let cardsDiv = document.getElementById("cards");

    var link = document.createElement('a');
    link.href = data.item;
    cardsDiv.appendChild(link);

    var card = document.createElement('div');
    card.className = 'card'; 

    link.appendChild(card);

    card.style.backgroundImage = 'url('+data.image+')';


    var headerdiv = document.createElement('div');
    headerdiv.className = 'header';
    card.appendChild(headerdiv);

    var titlediv = document.createElement('div');
    titlediv.className = 'title';
    headerdiv.appendChild(titlediv);
    titlediv.innerHTML = data.label.capitalize();

    if(data.description){
        var descriptiondiv = document.createElement('div');
        descriptiondiv.className = 'description';
        headerdiv.appendChild(descriptiondiv);
        descriptiondiv.innerHTML = data.description.capitalize();
    }

    var space = document.createElement('div');
    space.className = 'space';
    card.appendChild(space);

    for(var property in data.properties){
        var propdiv = document.createElement('div');
        propdiv.className = 'prop';
        card.appendChild(propdiv);

        var propnamediv = document.createElement('div');
        propdiv.appendChild(propnamediv);
        propnamediv.innerHTML = data.properties[property].property.capitalize();
        var propvaluediv = document.createElement('div');
        propdiv.appendChild(propvaluediv);
        propvaluediv.innerHTML = data.properties[property].value;
    }

    var qdiv = document.createElement('div');
    qdiv.className = 'qnr';
    card.appendChild(qdiv);
    qdiv.innerHTML = data.item;
}

window.onload = function() {
    var match = window.location.search.match(/Q\d+/g);
    var type = match && match[0] || "Q11344";
    statusField = document.getElementById("status");

    const typeNameQuery = `
    SELECT ?label WHERE {
      wd:${type} rdfs:label ?label.
      FILTER((LANG(?label)) = "en")
    }
    `;
    runQuery(typeNameQuery, results => {
        typeLabel = results[0].label.value;
        statusField.innerHTML = "Generating your <strong>"+typeLabel+"</strong> card game...";

        limitData(type);
    });
}
