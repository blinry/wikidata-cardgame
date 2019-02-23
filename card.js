String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

window.onload = function() {
    var data = {
        title: 'title of titles',
        qnumber: 'Q123456',
        description: 'The very nice and long description',
        properties: ['size','mass','pokeindex','age'],
        values: [34,12345,76, 150]
    };
    //genCard('myCanvas',data);
}


function genCard(data){
    let cardsDiv = document.getElementById("cards");
    let imagesDiv = document.getElementById("images");

    let canvas = document.createElement("canvas");
    canvas.width = "630px";
    canvas.height = "980px";
    canvas.style.width = "630px";
    canvas.style.height = "980px";
    canvas.id = data.label;

    let img = document.createElement("img");
    imagesDiv.appendChild(img)

    cardsDiv.appendChild(canvas);
    console.log(canvas.id);


    img.onload = function() {
        console.log("onload");
        paper.setup(canvas.id);
        with (paper) {
            
            var rect = new Rectangle(new Point(0,0), new Size(63*7, 98*7));
            var mask = new Path.Rectangle(new Rectangle(rect), 22);
            mask.clipMask = true;
            
            if (data.image) {
                var rasterimg = new Raster(img.id);
                var imgsize = rasterimg.size;
                var scaleimg = 1;
                if(imgsize.width<imgsize.height){
                    scaleimg = rect.width/imgsize.width;
                }else{
                    scaleimg = rect.height/imgsize.height;
                }
                rasterimg.scale(scaleimg);
                rasterimg.position = rect.center;
            }
            
            var outerborder = new Path.Rectangle(rect, 22);
            outerborder.strokeColor = 'black';
            var innerBorder = new Path.Rectangle([20,20], rect.size.subtract([40,40]),12);
            var border = outerborder.subtract(innerBorder);
            border.fillColor = 'white';
            
            var titlebox = new Path.Rectangle([0,rect.height/8], new Size(rect.width,100));
            titlebox.fillColor = 'white';
            titlebox.opacity = 0.7;
            var title = new PointText(titlebox.bounds.center);
            title.justification = 'center';
            title.fillColor = 'black';
            title.content = data.label.capitalize();
            title.fontSize = 30;
            var description = new PointText(titlebox.bounds.center.add([0,30]));
            description.justification = 'center';
            description.fillColor = 'black';
            description.content = data.description.capitalize();
            description.fontSize = 15;
            var qnr = new PointText([63*7-30, 98*7-10]);
            qnr.justification = 'right';
            qnr.fillColor = 'black';
            qnr.content = data.item;
            qnr.fontSize = 7;
            
            //for(var i = 0; i<data.properties.length; i++){
            var i = 0;
            for(var property in data.properties){
                
                var propbox = new Path.Rectangle([0,rect.height*(10-i)/12 + 20], new Size(rect.width,40));
                propbox.fillColor = 'white';
                propbox.opacity = 0.7;
                var prop = new PointText([40,rect.height*(10-i)/12 + 48]);
                prop.fillColor = 'black';
                prop.content = data.properties[property].property.capitalize();
                prop.fontSize = 20;
                var val = new PointText([rect.width-40,rect.height*(10-i)/12 + 48]);
                val.justification = 'right';
                val.fillColor = 'black';
                val.content = data.properties[property].value;
                val.fontSize = 20;
                i += 1;
            }
            
            
            view.draw();
        }
    }

    if (data.image) {
        img.id = canvas.id+"-img";
        img.src = data.image;
    } else {
        img.onload();
    }
}
