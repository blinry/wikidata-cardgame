const MAX_PROPERTIES = 5;
const MAX_CARDS = 32;
const API_URL = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=`;

let statusField = undefined;
let typeLabel = undefined;
let type = undefined;
let lang = undefined;
let imageProgress = 0;

String.prototype.trunc = String.prototype.trunc ||
    function(n) {
        return (this.length > n) ? this.substr(0, n - 1) + '&hellip;' : this;
    };

function setStatus(text) {
    statusField.innerHTML = text;
}

function getSuggestions(value){
    console.log(value);
    let qid = value.match(/Q\d+/)
    if( qid ){
        window.location = `/?${qid[0]}`;
    }else{
        window.fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&search=${value}&language=${lang}&uselang=${lang}&origin=*`)
        .then( response => {
            response.json().then(function(data) {
                let datalist = document.getElementById("suggestions");
                datalist.innerHTML = "";

                for(let item of data.search){
                    addOption(item.label, item.id, item.description)
                }
                console.log(data);
            });
        } );
    }

}

function addOption(label, id, description){
    let datalist = document.getElementById("suggestions");
    let option = document.createElement("option");

    let descText = ""
    if(description){
        descText = `${description}, `
    }
    option.value = `${label} (${descText}${id})`
    datalist.appendChild(option)
}

function runQuery(query, callback) {
    query = query.replace(/%/g, "%25");
    query = query.replace(/&/g, "%26");

    window.fetch(API_URL + query).then(
        function(response) {
            if (response.status !== 200) {
                setStatus(`The query took too long or failed. Please try again with a different topic.`);
                return;
            }
            response.json().then(function(data) {
                callback(data.results.bindings);
            });
        }
    ).catch(function(err) {
        setStatus('An error occurred while running the query: "' + err + '"');
    });
}

function preloadImage(url, totalCards) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.src = url;
        img.onload = function() {
            // An imageProgress of -1 indicates an error while async loading one of the images
            if (imageProgress < 0)
                return;

            imageProgress++;
            setStatus("Preparing your " + gameTypeHTML() + " card game, loading image <b>" + imageProgress + " of " + totalCards + "</b> card images.");
            return resolve();
        };
        img.onerror = function() {
            return reject("Error loading " + url);
        }
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
        return date.substring(0, 3) + "0s";
    } else if (precision == 7) {
        return ordinal(parseInt(date.substring(0, 2)) + 1) + " century";
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
        toFixedFix = function(n, prec) {
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

function unitSimplify(text) {
    text = text.replace(' per ', '/');

    text = text.replace('kilogram', 'kg');
    text = text.replace('gram', 'g');

    text = text.replace('cubic metre', 'm^3');
    text = text.replace('square metre', 'm^2');
    text = text.replace('centimetre', 'cm');
    text = text.replace('square kilometre', 'km^2');
    text = text.replace('kilometre', 'km');
    text = text.replace('metre', 'm');

    text = text.replace('astronomical unit', 'au');

    return text;
}

function gameTypeHTML() {
    return `<a href="https://www.wikidata.org/wiki/${type}" class="id">${typeLabel}</a>`;
}

function buildDeck(results) {
    // Step 1: Get good property candidates.
    let propertiesCount = {};
    for (let line of results) {
        if (line.property.value in propertiesCount) {
            propertiesCount[line.property.value].items.push(line.item.value);
        } else {
            propertiesCount[line.property.value] = { items: [line.item.value], id: line.property.value, label: line.propertyLabel.value };
        }
    }

    let propertiesSorted = [];

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    for (const property in propertiesCount) {
        propertiesSorted.push([property, propertiesCount[property].items.filter(onlyUnique).length, propertiesCount[property].label]);
    }

    propertiesSorted = propertiesSorted.sort((a, b) => b[1] - a[1]);
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
                if (line.unitLabel && line.unit.value != "http://www.wikidata.org/entity/Q199") {
                    value += " " + unitSimplify(line.unitLabel.value);
                }
            }
            if (line.item.value in items) {
            } else {
                items[line.item.value] = { item: line.item.value, label: line.itemLabel.value, properties: {} };
                if (line.image) {
                    items[line.item.value].image = line.image.value.replace('http://', 'https://') + '?width=1000';
                } else {
                    items[line.item.value].image = 'texture.png';
                }
                if (line.itemDescription) {
                    items[line.item.value].description = line.itemDescription.value;
                }
            }
            items[line.item.value].properties[line.propertyLabel.value] = { property: line.propertyLabel.value, value: value };
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
                i.properties[property[2]] = { property: property[2], value: "-" };
            }
            props.push(i.properties[property[2]]);
        }

        i.properties = props;
        it.push(i);
    }

    it.sort((a, b) => b.known_properties - a.known_properties);
    it = it.slice(0, MAX_CARDS);

    return it;
}

function runDataQuery(restriction, lang) {
    let query = `
    SELECT ?item ?itemLabel ?itemDescription ?image ?property ?propertyLabel ?valueLabel ?unit ?unitLabel ?precision WITH {
      SELECT DISTINCT ?item WHERE {
        ${restriction}
        ?item wikibase:statements ?statements.
      }
      ORDER BY DESC(?statements)
      LIMIT 100
    } AS %items
    WHERE {
      INCLUDE %items.

      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }

      OPTIONAL { ?item wdt:P18 ?image. }

      ?item ?p ?statement.
      ?statement a wikibase:BestRank.

      ?property wikibase:claim ?p.
      ?property rdf:type wikibase:Property .

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

    runQuery(query, results => {
        var deck = buildDeck(results);

        imageProgress = 0;
        var promises = [];
        for (let card of deck) {
            promises.push(preloadImage(card.image, deck.length));
        }

        Promise.all(promises).then(function() {
            for (let card of deck) {
                genCardHTML(card);
            }
            if (deck.length == 0) {
                setStatus("Didn't find enough information for a " + gameTypeHTML() + " card game. Please try a different topic.");
            } else {
                setStatus("Here's your " + gameTypeHTML() + " card game, consisting of " + deck.length + " cards.");
            }
        }, function(err) {
            imageProgress = -1;
            setStatus("An error occurred while generating the cards: " + err);
        });
    });
}

function genCardHTML(data) {
    let cardsDiv = document.getElementById("cards");

    var link = document.createElement('a');

    cardsDiv.appendChild(link);

    var card = document.createElement('div');
    card.className = 'card';

    link.appendChild(card);

    card.style.backgroundImage = 'url(' + data.image + ')';


    var headerdiv = document.createElement('div');
    headerdiv.className = 'header';
    card.appendChild(headerdiv);

    var titlediv = document.createElement('div');
    titlediv.className = 'title';
    headerdiv.appendChild(titlediv);
    titlediv.innerHTML = data.label.capitalize();

    if (data.description) {
        var descriptiondiv = document.createElement('div');
        descriptiondiv.className = 'description';
        headerdiv.appendChild(descriptiondiv);
        descriptiondiv.innerHTML = data.description.capitalize();
    }

    var space = document.createElement('div');
    space.className = 'space';
    card.appendChild(space);

    for (var property in data.properties) {
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

function populateTopics() {
    let select = document.querySelector("select");

    let topics = [
        "Q5119",
        "Q11344",
        "Q1032372",
        "Q142714",
        "Q5503",
        "Q6256",
        "Q23442",
        "Q35273",
    ]

    const topicQuery = `
    SELECT ?item ?itemLabel ?itemDescription WHERE {
      VALUES ?item {
          ${topics.map(t => `wd:${t}`).join(" ")}
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang}". }
    }
    `
    console.log(topicQuery)
    runQuery(topicQuery, results => {
        for (let topic of results) {
            /*let option = document.createElement("option");
            option.innerHTML = topic.itemLabel.value
            option.value = topic.item.value.split("/").pop()
            select.appendChild(option)*/
            addOption(topic.itemLabel.value, topic.item.value.split("/").pop(), null)
        }
        document.querySelector("#topic").value = type;
    })
}

function populateLanguageOptions() {
    const langQuery = `
    SELECT ?item ?code ?itemLabel (GROUP_CONCAT(?nativeLabel;separator="/") as ?nativeLabels) WHERE {
      ?item wdt:P424 ?code.
      ?item wdt:P1705 ?nativeLabel.

      MINUS { ?item (wdt:P31/wdt:P279*) wd:Q14827288. }
      MINUS { ?item (wdt:P31/wdt:P279*) wd:Q17442446. }
      MINUS { ?item wdt:P279+ wd:Q1860. }
      FILTER(?item != wd:Q22282939 && ?item != wd:Q22282914)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?item ?code ?itemLabel
    ORDER BY ?itemLabel
    `;
    runQuery(langQuery, results => {
        let select = document.querySelector("select");
        for (let line of results) {
            let option = document.createElement("option");
            option.innerHTML = `${line.itemLabel.value} (${line.code.value}) – ${line.nativeLabels.value}`.trunc(40);
            option.value = line.code.value;
            select.appendChild(option);
        }
        document.querySelector("#topic").value = type;
        document.querySelector("#lang").value = lang;
    });
}

function submitQuery(e) {
    e.preventDefault();
    console.log("hi");
    window.location = `/?${document.querySelector("#topic").value}`;
    return false;
}

window.onload = function() {
    var searchParams = new URLSearchParams(window.location.search)
    lang = searchParams.get("lang") || "ko";
    var match = window.location.search.match(/Q\d+/g);
    type = match && match[0] || "Q11344";

    statusField = document.getElementById("status");

    //populateLanguageOptions();
    populateTopics();

    const typeNameQuery = `
    SELECT ?itemLabel WHERE {
      BIND(wd:${type} as ?item)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang}". }
    }
    `;
    runQuery(typeNameQuery, results => {
        typeLabel = results[0].itemLabel.value;
        setStatus("Generating your " + gameTypeHTML() + " card game... (Fetching data may take a while!)");

        var restriction = `?item (wdt:P31|wdt:P106|wdt:P39)/(wdt:P279*|wdt:P171*) wd:${type}.`;
        runDataQuery(restriction, lang);
    });
}
