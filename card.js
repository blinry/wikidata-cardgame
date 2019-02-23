window.onload = function() {
    var data = {
        title: 'title of titles',
        qnumber: 'Q123456',
        description: 'The very nice and long description',
        properties: ['size','mass','pokeindex','age'],
        values: [34,12345,76, 150]
    };
    genCard('myCanvas',data);
}


function genCard(id,data){
    paper.setup(id);
    with (paper) {
        
        var rect = new Rectangle(new Point(0,0), new Size(63*7, 98*7));
        var mask = new Path.Rectangle(new Rectangle(rect), 22);
        mask.clipMask = true;
        
        var rasterimg = new Raster('nadel');
        var imgsize = rasterimg.size;
        var scaleimg = 1;
        if(imgsize.width>imgsize.height){
            scaleimg = rect.width/imgsize.width;
        }else{
            scaleimg = rect.height/imgsize.height;
        }
        rasterimg.scale(scaleimg);
        rasterimg.position = rect.center;
        
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
        title.content = data.title;
        title.fontSize = 30;
        var description = new PointText(titlebox.bounds.center.add([0,30]));
        description.justification = 'center';
        description.fillColor = 'black';
        description.content = data.description;
        description.fontSize = 15;
        var qnr = new PointText([63*7-30, 98*7-10]);
        qnr.justification = 'right';
        qnr.fillColor = 'black';
        qnr.content = data.qnumber;
        qnr.fontSize = 7;
        
        for(var i = 0; i<data.properties.length; i++){
            
            var propbox = new Path.Rectangle([0,rect.height*(10-i)/12 + 20], new Size(rect.width,40));
            propbox.fillColor = 'white';
            propbox.opacity = 0.7;
            var prop = new PointText([40,rect.height*(10-i)/12 + 48]);
            prop.fillColor = 'black';
            prop.content = data.properties[i];
            prop.fontSize = 20;
            var val = new PointText([rect.width-40,rect.height*(10-i)/12 + 48]);
            val.justification = 'right';
            val.fillColor = 'black';
            val.content = data.values[i];
            val.fontSize = 20;
        }
        
        
        view.draw();
    }
}
