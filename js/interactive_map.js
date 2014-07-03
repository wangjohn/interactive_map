var currentSlide = 0;
var currentTime = "2013-06-08 08:44:01 AM";

var w = 960, h = 500;
var stations, availableBikes, timestamps, the_goods;

var svg = d3.select("#graphic")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

var projection = d3.geo.albersUsa()
                       .translate([w/2, h/2])
                       .scale([1000]);

var path = d3.geo.path()
                 .projection(projection);

var g = svg.append("g");

function addCommas(nStr){
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

//to set the value from clicks
function setValue(theValue) {
  $('#slider').slider('value', theValue);
  $('#showValue').html(theValue);
}

//Draw the map of the United States
d3.json("data/us.json", function(err, us) {
  g.insert("path", ".graticule")
    .datum(topojson.feature(us, us.objects.land))
    .attr("class", "land")
    .attr("d", path);

  g.insert("path", ".graticule")
    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
    .attr("class", "state-boundary")
    .attr("d", path);
});

//show the spinner
$("#spinner").show();

d3.json("data/citibike-new.json", function(err, data){
  //remove the spinner after load
  $("#spinner").hide();

  the_goods = data;
  stations = data.stations;
  timestamps = data.timestamps;

  function lat (d) { return projection([d.longitude, d.latitude])[0]; }
  function lon (d) { return projection([d.longitude, d.latitude])[1]; }
  var rScale = d3.scale.sqrt()
                 .domain([1, 60])
                 .range([2, 34]);

  //apending a circle for each station, initial radius set to the radius at first time in timestamps array
  g.selectAll(".ab")
    .data(stations)
    .enter()
    .append("circle")
    .attr("class", "ab")
    .attr("cx", lat)
    .attr("cy", lon)
    .attr("r", function(d){
      if ( d.timeline[0] > 0) { return rScale(d.timeline[0]); }
      else {return 0;}
    })
    .style("opacity", ".35")
    .style("fill", "#306a76");

    g.selectAll(".station")
      .data(stations)
      .enter()
      .append("circle")
      .attr("class", "station")
      .attr("cx", lat)
      .attr("cy", lon)
      .attr("r", 1.25)
      .attr("opacity", ".7")
      .style("fill", "#2c344a"); //navy

  //initialize jquery slider, and call move function on slide, pass value to move()
  $( "#slider" ).slider({
    value: 0,
    min: 0,
    max: 2882,
    step: 1,
    slide: function( event, ui ){
      setSlide(ui.value);
    }
  });


  //gets called on every slide, updates size of circle and text element
  function setSlide(i) {
    //updated all of the circles radiussss
    g.selectAll(".ab")
      .data(stations)
      .attr("r", function(d){
        if ( d.timeline[currentSlide] > 0) { return rScale(d.timeline[currentSlide]); }
        else {return 0;}
    });
    //update position of the slider  
    $( "#slider" ).slider( "value", i );
    currentSlide = i;

    currentTime = timestamps[i];

    //parsed time
    var pt = Date.fromString(currentTime);
    
    //pass parsed time to moment to return correct format
    var time = moment(pt).format("dddd, MMMM Do, h:mm [<span>]a[</span>]");

    //get date in correct format to update day
    var dt = moment(pt).format("YYYY-MM-DD");
 
    update_day(dt);

    //get hour to check if it's dark or light
    var h = moment(pt).format("HH");
    change_bg(h);

    //updates current time
    d3.select("#current_time")
      .html(time);

    function update_day(dt){
      // TODO: perform date update
    }

    function change_bg(h){
      //checking to see if the hour is before 5am or after 7pm
      if (h < 5 || h > 19)
        { //if yes, change bg to dark (IT'S NIGHT TIME)
          d3.select("body")
            .transition()
            .duration(250)
            .style("background-color", "#3c3c3c");
          d3.selectAll("h1")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.selectAll(".description")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.select("#wrap")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.selectAll(".description a")
            .transition()
            .duration(250)
            .style("color", "white");
        }
      else if (h == 5 || h == 19)
        { //if no, change bg to white (IT'S DAWN OR DUSK TIME)
          d3.select("body")
            .transition()
            .duration(250)
            .style("background-color", "#666666");
          d3.selectAll("h1")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.selectAll(".description")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.select("#wrap")
            .transition()
            .duration(250)
            .style("color", "white");
          d3.selectAll(".description a")
            .transition()
            .duration(250)
            .style("color", "white");
        }
      else
        { //if no, change bg to white (IT'S DAY TIME)
          d3.select("body")
            .transition()
            .duration(250)
            .style("background-color", "white");
          d3.selectAll("h1")
            .transition()
            .duration(250)
            .style("color", "black");
          d3.selectAll(".description")
            .transition()
            .duration(250)
            .style("color", "black");
          d3.select("#wrap")
            .transition()
            .duration(250)
            .style("color", "black");
          d3.selectAll(".description a")
            .transition()
            .duration(250)
            .style("color", "black");
        }
    }


  } //END OF UPDATE FUNCTION

  var playInterval;
  var autoRewind = true;

  function getSpeed(){
    var speed = $("input:radio[name=speed]:checked").val();
    if (speed == "fast"){ return 100; }
    else if (speed == "slow") { return 250; }
  }

  // Thank you to the guy who created this - http://jsfiddle.net/amcharts/ZPqhP/
  $('#play').click(
    function(){
      if (playInterval !== undefined){
          clearInterval(playInterval);
          playInterval = undefined;
          $(this).html("play");
          return;
        }
      $(this).html("pause");
      playInterval = setInterval(function(){
        currentSlide++;
        if (currentSlide > 2882){
          if (autoRewind){
            currentSlide = 0;
          }
          else {
            clearInterval(playInterval);
            return;
          }
        }
        setSlide(currentSlide);
      }, getSpeed() );
  });

  //hover state for each station
  d3.selectAll(".ab")
    .on("mouseover", function(d) {
          d3.select("#tooltip")
            .style("opacity", 1);
          d3.select(this)
            .style("opacity", ".9")
            .style("stroke", "white")
            .style("stroke-width", "2");
          d3.select("#tooltip")
            .style("left", (d3.event.pageX) + 20 + "px")
            .style("top", (d3.event.pageY) - 30 + "px");
          d3.select('#name')
            .text(d.stationName);
          d3.select('#a-bikes')
            .text(d.timeline[currentSlide]);
    })
    .on("mouseout", function() {
      //Hide the tooltip
      d3.select("#tooltip")
        .style("opacity", 0);
      d3.select(this)
        // .transition()
        .style("opacity", ".35")
        .style("stroke-width", "0");
  });

}); /*END OF D3.JSON function*/
