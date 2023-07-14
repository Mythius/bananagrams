class mouse{
    static pos = { x: 0, y: 0 };
    static down = false;
    static right = false;
    static start(element=document.documentElement) {
        function mousemove(e) {
            let br = element.getBoundingClientRect();
            mouse.pos.x = e.clientX - br.left;
            mouse.pos.y = e.clientY - br.top;
        }

        function mouseup(e) {
            if(e.which == 1){
                mouse.down = false;
            } else if(e.which == 3){
                mouse.right = false;
            }
        }

        function mousedown(e) {
            mousemove(e);
            if(e.which == 1){
                mouse.down = true;
            } else if(e.which == 3){
                mouse.right = true;
            }
        }
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
        document.addEventListener('mousedown', mousedown);
        document.addEventListener('contextmenu',e=>{e.preventDefault()});
    }
}
class keys{
    static keys = [];
    static start(){
        function keydown(e){
            keys.keys[e.key] = true;
        }
        function keyup(e){
            keys.keys[e.key] = false;
        }
        document.addEventListener('keydown',keydown);
        document.addEventListener('keyup',keyup);
    }
    static down(key){
        if(key in keys.keys){
            return keys.keys[key];
        }
        return false;
    }
}
class Touch{
    static touches = [];
    static resolved = [];
    static init(callback){
        document.on('touchstart',e=>{
            for(let touch of e.changedTouches){
                Touch.touches[touch.identifier] = touch;
                e.preventDefault();
            }
        });

        document.on('touchmove',e=>{
            if(Touch.touches.filter(e=>e).length == 1){
                for(let touch of e.changedTouches){
                    let last_pos = Touch.touches[touch.identifier];
                    callback({
                        type: 'scroll',
                        x: touch.clientX,
                        y: touch.clientY,
                        dx: touch.clientX - last_pos.clientX,
                        dy: touch.clientY - last_pos.clientY,
                        target: last_pos.target
                    });
                    touch.action='scroll';
                    Touch.touches[touch.identifier] = touch;
                } 
            } else {
                let counter = 0;
                let tmps = [];
                for(let last_pos of Touch.touches.filter(e=>e)){
                    let touch = [...e.changedTouches].filter(e=>last_pos.identifier==e.identifier)[0];
                    if(touch){
                        tmps.push({
                            x: touch.clientX,
                            y: touch.clientY,
                            dx: touch.clientX - last_pos.clientX,
                            dy: touch.clientY - last_pos.clientY
                        });
                        touch.action='zoom';
                        Touch.touches[touch.identifier] = touch;
                    } else {
                        tmps.push({
                            x: last_pos.clientX,
                            y: last_pos.clientY,
                            dx: 0,
                            dy: 0
                        });
                    }
                    if(++counter == 2) break;
                }
                let scale = (tmps[0].y+tmps[0].dy-tmps[1].y-tmps[1].dy)/(tmps[0].y-tmps[1].y);
                let ct = {x:(tmps[0].x+tmps[1].x)/2,y:(tmps[0].y+tmps[1].y)/2};
                callback({
                    type: 'zoom',
                    touch1: tmps[0],
                    touch2: tmps[1],
                    scale,
                    ct
                });
            }
        })

        document.on('touchend',e=>{
            for(let touch of e.changedTouches){
                let ot = Touch.touches[touch.identifier];
                if(!ot.action){
                    let dx=ot.clientX-touch.clientX,dy=ot.clientY-touch.clientY;
                    if(Math.sqrt(dx**2+dy**2) < 5){
                        let br = ot.target.getBoundingClientRect();
                        callback({
                            type:'click',
                            x:ot.clientX - br.x,
                            y:ot.clientY - br.y,
                            target:ot.target
                        });
                    }
                }
                Touch.touches[touch.identifier] = null;
            }
        });
    }
}