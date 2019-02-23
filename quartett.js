const query = `
SELECT ?item ?itemLabel ?image ?propLabel ?valueLabel ?unitLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1221156.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
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

    ?statement ?ps ?value.

    ?property wikibase:statementProperty ?ps.
  }
}
        `;
const url = `https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=${query}`;
window.fetch(url).then(
    function (response) {
        if (response.status !== 200) {
            console.warn(`Looks like there was a problem. Status Code: ${response.status}`);
            return;
        }
        response.json().then(function (data) {
            let result = "";
            for (let line of data.results.bindings) {
                var itemLabel = line.itemLabel.value;
                var propLabel = line.propLabel.value;
                var valueLabel = line.valueLabel.value;
                result += itemLabel+", "+propLabel+": "+valueLabel+"<br>";
            }
            var resultDiv = document.getElementById("result");
            resultDiv.innerHTML = result;
        });
    }
).catch(function (err) {
    console.warn('Fetch Error :-S', err);
});
