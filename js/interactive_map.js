// Constants
var START_DATE = "1/1/2014";
var TIME_INTERVAL = (60*1000*60*24)*5;

// Initialize variables
var currentSlide = 0;
var currentTime = "2013-06-08 08:44:01 AM";

var w = 960, h = 500;
var stations, timestamps;

var svg = d3.select("#graphic")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

var projection = d3.geo.conicConformal()
                       .rotate([98.35, 0])
                       .center([0, 39.5])
                       .translate([w/2, h/2])
                       .scale([1200]);

var path = d3.geo.path()
                 .projection(projection);

var g = svg.append("g");

function createTimestampsArray(events, interval) {
  events.sort(function(a,b) {
    return (new Date(a.date) - new Date(b.date));
  });

  var timestampArray = [];
  var intervalStartDate = new Date(START_DATE);
  var intervalEndDate = new Date(intervalStartDate.getTime() + interval);

  var currentDateTime;
  var currentEventSet = [];
  for (var i=0; i<events.length; i++) {
    currentDateTime = new Date(events[i].date).getTime();

    if (currentDateTime < intervalEndDate().getTime()) {
      currentEventSet.push(events[i]);
    } else {
      timestampArray.push({
        "date": intervalStartDate,
        "events": currentEventSet,
      });
      currentEventSet = [];
      intervalStartDate = intervalEndDate;
      intervalEndDate = new Date(intervalStartDate.getTime() + interval);
    }
  }

  return timestampArray;
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

d3.json("data/interactive_map.json", function(err, data){
  //remove the spinner after load
  $("#spinner").hide();

  var timestampsArray = createTimestampsArray(data.events, TIME_INTERVAL);

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
    //updated all of the circle radius
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

    //updates current time
    d3.select("#current_time")
      .html(time);

    function update_day(dt){
      // TODO: perform date update
    }

  } //END OF UPDATE FUNCTION

  var playInterval;
  var autoRewind = true;
  var playSpeed = 100;

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
      }, playSpeed);
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
        .style("opacity", ".35")
        .style("stroke-width", "0");
  });

}); /*END OF D3.JSON function*/
