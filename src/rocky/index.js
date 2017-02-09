var rocky = require('rocky');
var ticker = '';
var free_busy = [];
var events = {};
var quarter = 0.5*Math.PI;
var sutki = 2*Math.PI;
var midday = 1.5*Math.PI;
var midnight = 3.5*Math.PI;
var minute = 2 * Math.PI / 60;
var minute_counter = 0;
var weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var marks_angles = [];
var marks_types = []; //0 - long; 1 - medium; 2 - short;
marks_angles[0]=0;
marks_types[0]=0;
for (var i=1 ; i<=59;i++){
	marks_angles[i] = marks_angles[i-1] + minute;
  if (i==0||i==15||i==30||i==45){marks_types[i] = 0;}
	else if (i==5||i==10||i==20||i==25||i==35||i==40||i==50||i==55){marks_types[i] = 1;}
	else {marks_types[i] = 2;}
}

rocky.on('message', function(event) {
  // Get the message that was passed
	//console.log("MESSAGE RECEIVED: \n" + JSON.stringify(event.data));
	var msg = event.data;
	if (msg.type == "ticker"){
		ticker = msg.data;
	}else if (msg.type == "free_busy"){
		free_busy = [];
		for (var i=0; i < msg.data.length;i++){
			free_busy.push( { 'start' : msg.data[i].start , 'end' : msg.data[i].end} );
		}
		
	}else if (msg.type == "events"){
		events = msg.data;
	}
});

rocky.on('minutechange', function(event) {
  //rocky.requestDraw();
});

rocky.on('secondchange', function(event) {
  rocky.postMessage({"fetch": true});
	rocky.requestDraw();
});

rocky.on('draw', function(event) {
  var ctx = event.context;
	//CanvasRenderingContext2D.clearRect(x, y, width, height)
  ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
	ctx.fillStyle = 'white';
	
	//CanvasRenderingContext2D.fillRect(x, y, width, height)
	ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
	
	ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  var w = ctx.canvas.unobstructedWidth;
  var h = ctx.canvas.unobstructedHeight;
	var cx = w/2;
	var cy = h/2;

			
	//draw the hand of SECONDS
	var d = new Date();
	var secondAngle = 2 * Math.PI * d.getSeconds() / 60;
	draw_free_busy(ctx, cx , cy , cx-12 , cx-8, 'red', 'grey', secondAngle-quarter);
	//draw_free_busy_am(ctx, cx , cy , cx-21 , cx-11, 'black', 'red');
	//draw_free_busy_pm(ctx, cx , cy , cx-32 , cx-22, 'black', 'red');
	
	//function draw_marks(canvas, x, y, outerRadius, length_long, width_long, color_long, length_short, width_short, color_short){
	draw_marks(ctx,cx,cy, cx, 13,2,'black', 7,1,'black');
	
	drawHand(ctx, cx, cy, secondAngle, cx-22, cx-12, 2, 'red');
	
	ctx.fillStyle = 'black';
	//CanvasRenderingContext2D.fillText(text, x, y, maxWidth)
	ctx.fillText(ticker , cx, cy+1, w-40);
	
	var curr_time = '';
	if (d.getHours()<10){curr_time += '0';}
	curr_time += d.getHours() + ':';
	if (d.getMinutes()<10){curr_time += '0';}
	curr_time += d.getMinutes();
	ctx.font = '42px bold numbers Leco-numbers';
	ctx.fillText(curr_time, cx, cy-ctx.measureText(curr_time).height, w);
	
	var curr_date = '';
	ctx.font = '18px bold Gothic';
	curr_date = d.getDate() + ' ' + months[d.getMonth()] + ', ' + weekdays[d.getDay()] + '.';
	ctx.fillText(curr_date, cx, cy/4, w);
});

function draw_marks(canvas, x, y, outerRadius, length_long, width_long, color_long, length_short, width_short, color_short){
	var l=0;
	var w=0;
	var c='';
	for (var i=0;i<=59;i++){
		//function drawHand(canvas, cx, cy, angle, innerRadius, outerRadius, width, color)
		if (marks_types[i]==0){l=length_long+3;w=width_long+1;c=color_long;}
		else if (marks_types[i]==1){l=length_long;w=width_long;c=color_long;}
		else {l=length_short;w=width_short;c=color_short;}
		drawHand(canvas, x, y, marks_angles[i], outerRadius-l, outerRadius, w, c);
	}
}

function draw_free_busy_am(canvas, x, y, innerRadius, outerRadius, color_am, color_pm){
	canvas.fillStyle = color_am;
	for (var i=0;i<free_busy.length;i++){
		if (free_busy[i].end < midday){
			canvas.rockyFillRadial(x , y , innerRadius , outerRadius, free_busy[i].start,  free_busy[i].end);			
		}
	}
}

function draw_free_busy_pm(canvas, x, y, innerRadius, outerRadius, color_am, color_pm){
	canvas.fillStyle = color_pm;
	for (var i=0;i<free_busy.length;i++){
		if (free_busy[i].end < midnight && free_busy[i].start > midday){
			canvas.rockyFillRadial(x , y , innerRadius , outerRadius, free_busy[i].start,  free_busy[i].end);			
		}
	}
}


function draw_free_busy(canvas, x, y, innerRadius, outerRadius, color_am, color_pm, angle){
	for (var i=0;i<free_busy.length;i++){
		//console.log("draw_free_busy: free_busy["+i+"]: " + free_busy[i].start + '|' + free_busy[i].end);
		//CanvasRenderingContext2D.rockyFillRadial(x, y, innerRadius, outerRadius, startAngle, endAngle)
		
		if (free_busy[i].end < midday){
			canvas.fillStyle = color_am;
			canvas.rockyFillRadial(x , y , innerRadius , outerRadius, Math.max(angle,free_busy[i].start),  free_busy[i].end);
		}else if(free_busy[i].start < midnight){
			if (free_busy[i].start < midday){
				canvas.fillStyle = color_am;
				canvas.rockyFillRadial(x , y , innerRadius , outerRadius, Math.max(free_busy[i].start, angle), midday);
			}
			canvas.fillStyle = color_pm;
			canvas.rockyFillRadial(x , y , innerRadius , outerRadius, Math.max(midday,free_busy[i].start),  Math.min(free_busy[i].end , angle+sutki));
		}
	}	
}		

function drawHand(canvas, cx, cy, angle, innerRadius, outerRadius, width, color) {
  // Find the end points

	var x1 = cx + Math.sin(angle) * innerRadius;
  var y1 = cy - Math.cos(angle) * innerRadius;
	var x2 = cx + Math.sin(angle) * outerRadius;
  var y2 = cy - Math.cos(angle) * outerRadius;
	
  // Configure how we want to draw the hand
  canvas.lineWidth = width;
  canvas.strokeStyle = color;

  // Begin drawing
  canvas.beginPath();

  // Move to the center point, then draw the line
  canvas.moveTo(x1, y1);
  canvas.lineTo(x2, y2);

  // Stroke the line (output to display)
  canvas.stroke();
}
	

rocky.on('memorypressure', function(event) {
  console.warning(event.level);
});

///////////////////////////////////////////////////////////////////////////
