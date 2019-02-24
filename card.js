String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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
