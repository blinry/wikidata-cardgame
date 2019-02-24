String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function genCard(data){
    let cardsDiv = document.getElementById("cards");
    let imagesDiv = document.getElementById("images");


    let canvas = document.createElement("canvas");
    canvas.style.width = ""+(63*7)*0.8+"px";
    canvas.style.height = ""+(88*7)*0.8+"px";
    canvas.id = data.label;

    let a = document.createElement("a");
    a.href = data.item;
    a.target = "_blank";

    let img = document.createElement("img");
    imagesDiv.appendChild(img)

    cardsDiv.append(a)
    a.appendChild(canvas);
    console.log(canvas.id);


    img.onload = function() {
        paper.setup(canvas.id);
        with (paper) {
            
            var rect = new Rectangle(new Point(0,0), new Size(63*7, 88*7));
            var mask = new Path.Rectangle(new Rectangle(rect), 22);
            mask.clipMask = true;
            
            if (data.image) {
                var rasterimg = new Raster(img.id);
                var imgsize = rasterimg.size;
                var scaleimg = 1;
                if(imgsize.width/imgsize.height < rect.width/rect.height){
                    scaleimg = rect.width/imgsize.width;
                }else{
                    scaleimg = rect.height/imgsize.height;
                }
                rasterimg.scale(scaleimg);
                rasterimg.position = rect.center;
            }
            
            var outerborder = new Path.Rectangle(rect, 22);
            var innerBorder = new Path.Rectangle([20,20], rect.size.subtract([40,40]),12);
            var border = outerborder.subtract(innerBorder);
            border.fillColor = 'white';
            
            var titlebox = new Path.Rectangle([0,rect.height/8], new Size(rect.width,120));
            titlebox.fillColor = 'white';
            titlebox.opacity = 0.8;
            var title = new PointText(titlebox.bounds.center.subtract([0,10]));
            title.justification = 'center';
            title.fillColor = 'black';
            title.content = data.label.capitalize();
            title.fontSize = 30;
            if(data.description){
                if(data.description.length<45){
                    var description = new PointText(titlebox.bounds.center.add([0,30]));
                    description.justification = 'center';
                    description.fillColor = 'black';
                    description.content = data.description.capitalize();
                    description.fontSize = 15;
                }else{
                    var spl = data.description.substring(0, 45).lastIndexOf(' ');
                    console.log(spl);
                    var desc1 = data.description.substring(0, spl);
                    var desc2 = data.description.substring(spl);
                    var description = new PointText(titlebox.bounds.center.add([0,20]));
                    description.justification = 'center';
                    description.fillColor = 'black';
                    description.content = desc1.capitalize();
                    description.fontSize = 15;
                    var description2 = new PointText(titlebox.bounds.center.add([0,40]));
                    description2.justification = 'center';
                    description2.fillColor = 'black';
                    description2.content = desc2;
                    description2.fontSize = 15;
                }
            }
            var qnr = new PointText([63*7-30, 88*7-10]);
            qnr.justification = 'right';
            qnr.fillColor = 'black';
            qnr.content = data.item;
            qnr.fontSize = 7;
            
            //for(var i = 0; i<data.properties.length; i++){
            var i = 0;
            for(var property in data.properties){
                
                var propbox = new Path.Rectangle([0,rect.height*(10-i)/12 + 20], new Size(rect.width,40));
                propbox.fillColor = 'white';
                propbox.opacity = 0.8;
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
            
            project.activeLayer.scale(0.8);
            project.activeLayer.translate([-rect.width/2*0.2,-rect.height/2*0.2]);
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
