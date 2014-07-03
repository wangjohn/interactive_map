/*
 * Constants
 */
var START_DATE = "1/1/2014";
var TIME_INTERVAL = (60*1000*60*24)*5;
var PLAY_SPEED = 300;
var MAP_WIDTH = 960;
var MAP_HEIGHT = 500;
var MAXIMUM_NODE_AGE = 10;

/*
 * Variable initialization
 */
var currentSlide = 0;
var timestampsArray;

var svg = d3.select("#graphic")
            .append("svg")
            .attr("width", MAP_WIDTH)
            .attr("height", MAP_HEIGHT);

var projection = d3.geo.conicConformal()
                       .rotate([98.35, 0])
                       .center([0, 39.5])
                       .translate([MAP_WIDTH/2, MAP_HEIGHT/2])
                       .scale([1200]);

var path = d3.geo.path()
                 .projection(projection);

var g = svg.append("g");

/*
 * Helper Functions
 */
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

    if (currentDateTime < intervalEndDate.getTime()) {
      if (events[i].latitude && events[i].longitude) {
        currentEventSet.push(events[i]);
      }
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

function lat (d) {
  return projection([d.longitude, d.latitude])[0];
}

function lon (d) {
  return projection([d.longitude, d.latitude])[1];
}

var rScale = d3.scale.sqrt()
               .domain([1, 60])
               .range([10, 70]);

function updateMapNodes(mapInstance) {
  mapInstance.selectAll(".kill-event").remove();
}

function createMapNodes(mapInstance, events) {
  mapInstance.selectAll(".kill-event")
    .data(events)
    .enter()
    .append("circle")
    .attr("class", "kill-event age-1")
    .attr("cx", lat)
    .attr("cy", lon)
    .attr("r", function(d){
      if ( d.peopleKilled > 0) { return rScale(d.peopleKilled); }
      else {return 0;}
    })
    .style("opacity", ".35")
    .style("fill", "#306a76");
}

function enableNodeHover() {
  d3.selectAll(".kill-event")
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
      d3.select('#venue-name')
        .text(d.venue);
      d3.select('#weapon-names')
        .text(d.weaponTypes);
    })
    .on("mouseout", function() {
      //Hide the tooltip
      d3.select("#tooltip")
        .style("opacity", 0);
      d3.select(this)
        .style("opacity", ".35")
        .style("stroke-width", "0");
  });
}

function setValue(theValue) {
  $('#slider').slider('value', theValue);
  $('#showValue').html(theValue);
}

/*
 * D3 Rendering
 */

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

//Use the interactive map data and play things
d3.json("data/interactive_map_data.json", function(err, data){
  //remove the spinner after load
  $("#spinner").hide();

  var timestampsArray = createTimestampsArray(data.events, TIME_INTERVAL);
  var maximumSlide = timestampsArray.length - 1;

  //apending a circle for each station, initial radius set to the radius at first time in timestamps array
  createMapNodes(g, timestampsArray[0].events);
  enableNodeHover();

  //initialize jquery slider, and call move function on slide, pass value to move()
  $( "#slider" ).slider({
    value: 0,
    min: 0,
    max: maximumSlide,
    step: 1,
    slide: function( event, ui ){
      setSlide(ui.value);
    }
  });

  //gets called on every slide, updates size of circle and text element
  function setSlide(i) {
    updateMapNodes(g);
    createMapNodes(g, timestampsArray[i].events);

    //update position of the slider
    $( "#slider" ).slider( "value", i );
    currentSlide = i;

    var currentTime = timestampsArray[i].date;

    //pass parsed time to moment to return correct format
    var time = moment(currentTime).format("dddd, MMMM Do, h:mm [<span>]a[</span>]");

    //get date in correct format to update day
    var dt = moment(currentTime).format("YYYY-MM-DD");
    update_day(dt);

    //updates current time
    d3.select("#current_time")
      .html(time);

    function update_day(dt){
      // TODO: perform date update
    }

    enableNodeHover();

  } //END OF UPDATE FUNCTION

  var playInterval;
  var autoRewind = true;

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
        if (currentSlide > maximumSlide){
          if (autoRewind){
            currentSlide = 0;
          }
          else {
            clearInterval(playInterval);
            return;
          }
        }
        setSlide(currentSlide);
      }, PLAY_SPEED);
  });
});
