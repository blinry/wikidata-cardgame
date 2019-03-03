const NUM_PROPERTIES = 5;
const NUM_CARDS = 32;
const url = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=`;

let statusField = undefined;
let typeLabel = undefined;

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

function unitSimplify(text){
    text = text.replace('kilogram per cubic metre','kg/m^3');
    text = text.replace('gram per cubic centimetre','g/cm^3');
    text = text.replace('gram per cubic metre','g/m^3');
    text = text.replace('square kilometre','km^2');
    text = text.replace('square metre','m^2');
    text = text.replace('centimetre','cm');
    text = text.replace('kilometre','km');
    text = text.replace('metre','m');
    text = text.replace('astronomical unit','au');
    return text;
}

function buildDeck(data) {
    // Step 1: Get good property candidates.
    let propertiesCount = {};
    for (let line of data.results.bindings) {
        if (line.property.value in propertiesCount) {
            propertiesCount[line.property.value].count += 1;
        } else {
            propertiesCount[line.property.value] = {count: 1, id: line.property.value, label: line.propLabel.value};
        }
    }

    let propertiesSorted = [];

    for (const property in propertiesCount) {
        propertiesSorted.push([property, propertiesCount[property].count, propertiesCount[property].label]);
    }

    propertiesSorted = propertiesSorted.sort((a,b) => b[1] - a[1]);
    //propertiesSorted = propertiesSorted.sort((a,b) => Math.random()+0.01);

    propertiesSorted = propertiesSorted.filter(p => p[2].length < 30);

    propertiesSorted = propertiesSorted.slice(0, NUM_PROPERTIES);
    //console.log(propertiesSorted);

    // Step 2: Get items which have all these properties.
    let items = {};

    for (let line of data.results.bindings) {
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
                value = line.valueLabel.value;
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

    //console.log(items);

    let it = [];
    for (let item in items) {
        let i = items[item];
        i.known_properties = Object.keys(i.properties).length;

        let props = [];

        for (let property of propertiesSorted) {
            //console.log(i);
            if (property[2] in i.properties) {
            } else {
                i.properties[property[2]] = {property: property[2], value: "-"};
            }
            props.push(i.properties[property[2]]);
        }

        i.properties = props;
        it.push(i);
    }
    it.sort((a,b) => a.valid_count - b.valid_count);

    it.sort((a,b) => b.known_properties - a.known_properties);
    it = it.slice(0, NUM_CARDS);

    return it;
}

function sampleData(type) {
    if (type && type.match(/^Q\d+$/)) {
        var restriction = "?item wdt:P31 wd:"+type+".";
    } else {
        var restriction = "?item wdt:P31 wd:Q11344.";
    }
    const query = `
    SELECT ?item ?itemLabel ?itemDescription ?image ?property ?propLabel ?valueLabel ?unitLabel ?precision WHERE {
      SERVICE bd:sample {
        ${restriction}
        bd:serviceParam bd:sample.limit 3000 .
        bd:serviceParam bd:sample.sampleType "RANDOM".
      }
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

    console.log("Running query...");
    window.fetch(url+query).then(
        function (response) {
            if (response.status !== 200) {
                console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
                return;
            }
            response.json().then(function (data) {
                console.log("Query completed.");
                var deck = buildDeck(data);
                console.log("Deck built: "+deck.length+" cards");

                for (let card of deck) {
                    genCardHTML(card);
                }
                statusField.innerHTML = "Here's your <strong>"+typeLabel+"</strong> card game, consisting of "+deck.length+" cards:";
            });
        }
    ).catch(function (err) {
        console.warn('Fetch Error :-S', err);
    });
}

function limitData(type) {
    if (type && type.match(/^Q\d+$/)) {
        var restriction = "?item wdt:P31/wdt:P279* wd:"+type+".";
    } else {
        var restriction = "?item wdt:P31/wdt:P279* wd:Q11344.";
    }
    const query = `
    SELECT ?item ?itemLabel ?itemDescription ?image ?property ?propLabel ?valueLabel ?unitLabel ?precision WHERE {
      ${restriction}
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

    console.log("Running query...");
    window.fetch(url+query).then(
        function (response) {
            if (response.status !== 200) {
                console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
                return;
            }
            response.json().then(function (data) {
                console.log("Query completed.");
                var deck = buildDeck(data);
                console.log("Deck built: "+deck.length+" cards");

                for (let card of deck) {
                    genCardHTML(card);
                }

                statusField.innerHTML = "Here's your <strong>"+typeLabel+"</strong> card game, consisting of "+deck.length+" cards:";
            });
        }
    ).catch(function (err) {
        console.warn('Fetch Error :-S', err);
    });
}

window.onload = function() {
    var type = window.location.search.substr(1) || "Q11344";
    statusField = document.getElementById("status");

    const typeNameQuery = `
    SELECT ?label WHERE {
      wd:${type} rdfs:label ?label.
      FILTER((LANG(?label)) = "en")
    }
    `;
    window.fetch(url+typeNameQuery).then(
        function (response) {
            if (response.status !== 200) {
                console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
                return;
            }
            response.json().then(function (data) {
                typeLabel = data.results.bindings[0].label.value;
                statusField.innerHTML = "Generating your <strong>"+typeLabel+"</strong> card game...";

                const countQuery = `
                SELECT (COUNT(?item) AS ?count) WHERE { ?item wdt:P31 wd:${type}. }
                `;

                window.fetch(url+countQuery).then(
                    function (response) {
                        if (response.status !== 200) {
                            console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
                            return;
                        }
                        response.json().then(function (data) {
                            console.log("Count completed.");
                            let count = data.results.bindings[0].count.value;
                            console.log(count);
                            if (count > 100) {
                                sampleData(type);
                            } else {
                                limitData(type);
                            }
                        });
                    }
                ).catch(function (err) {
                    console.warn('Fetch Error :-S', err);
                });
            });
        }
    ).catch(function (err) {
        console.warn('Fetch Error :-S', err);
    });

}
