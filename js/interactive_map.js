/*
 * Constants
 */
var START_DATE = "1/1/2014";
var TIME_INTERVAL = (60*1000*60*24)*3;
var PLAY_SPEED = 150;
var MAP_WIDTH = 960;
var MAP_HEIGHT = 500;
var PRIMARY_NODE_AGE = 10;
var NODE_DECAY_LENGTH = 25;
var MAXIMUM_EXTRA_NODE_SIZE = 0.1;

var NORMAL_NODE_COLOR = "#306a76";
var HIGHLIGHTED_NODE_COLOR = "#DF1B00";

var VENUE_NAME_MAP = {
  "1": "School (includes university, college, etc.)",
  "2": "Office",
  "3": "Manufacturing (includes warehouse, factory, etc.)",
  "4": "Government building",
  "5": "Courthouse (includes jail, etc.)",
  "6": "Hotel (includes motel, etc.)",
  "7": "Casino",
  "8": "Industrial (includes oil rig, mine, chemical plant, nuclear plant, etc.)",
  "9": "Transportation (includes airport, metro, train, cruise, etc.)",
  "10": "Large venue (includes stadium, raceway, amusement park, etc.)",
  "11": "Hospital",
  "12": "Military base"
};

var WEAPON_NAME_MAP = {
  "pistol": "Pistol",
  "rifle": "Rifle",
  "shotgun": "Shotgun",
  "unknownGun": "Unknown Gun",
  "explosive": "Explosive",
  "knife": "Knife",
  "nonMetallicObject": "Non-Metallic Object"
};

/*
 * Variable initialization
 */
var currentSlide = 0;
var timestampsArray;
var venueSelected = "all";
var weaponSelected = "all";
var playInterval;
var maximumSlide;
var autoRewind = true;

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
 * Initialization for non D3 parts of the display
 */
$("#close-information-panel").on("click", function() {
  $("#information-panel").fadeOut(500);
});

$("#venue-dropdown").on("change", function() {
  venueSelected = $("#venue-dropdown").val();
  changeNodeColors();
});

$("#weapon-dropdown").on("change", function() {
  weaponSelected = $("#weapon-dropdown").val();
  changeNodeColors();
});


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
  var eventCounter = 0;
  while (eventCounter < events.length) {
    currentDateTime = new Date(events[eventCounter].date).getTime();

    if (currentDateTime < intervalStartDate.getTime()) {
      while (currentDateTime < intervalStartDate.getTime()) {
        timestampArray.push({
          "date": intervalStartDate,
          "events": []
        });
        intervalStartDate = intervalEndDate;
        intervalEndDate = new Date(intervalStartDate.getTime() + interval);
      }
    } else if (currentDateTime < intervalEndDate.getTime()) {
      if (events[eventCounter].latitude && events[eventCounter].longitude) {
        currentEventSet.push(events[eventCounter]);
      }
      eventCounter += 1;
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

  if (currentEventSet.length > 0) {
    timestampArray.push({
      "date": intervalStartDate,
      "events": currentEventSet,
    });
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

function createAgeDecayedEvent(originalEvent, ageDecay) {
  var newEvent = {};
  for (var key in originalEvent) {
    newEvent[key] = originalEvent[key];
  }
  newEvent["ageDecay"] = ageDecay;
  return newEvent;
}

function getEventWrappers(timestampsArray, arrayIndex) {
  var events = [];
  for (var i=0; i<(PRIMARY_NODE_AGE + NODE_DECAY_LENGTH); i++) {
    if (arrayIndex - i >= 0) {
      var originalEvents = timestampsArray[arrayIndex - i].events;
      for (var j=0; j<originalEvents.length; j++) {
        events.push(createAgeDecayedEvent(originalEvents[j], i))
      }
    }
  }
  return events;
}

function radiusFunction(d) {
  if (d.peopleKilled > 0) {
    var ageDecayAdjustment;

    if (d.ageDecay < PRIMARY_NODE_AGE) {
      var nodeAgeMidpoint = (PRIMARY_NODE_AGE / 2) - 1;
      ageDecayAdjustment = ((-1.0 / PRIMARY_NODE_AGE) * Math.abs(d.ageDecay - (nodeAgeMidpoint)) + 1) * MAXIMUM_EXTRA_NODE_SIZE;
    } else {
      ageDecayAdjustment = Math.max((-1) * ((d.ageDecay + 1 - PRIMARY_NODE_AGE) / NODE_DECAY_LENGTH), -1);
    }

    return rScale(d.peopleKilled) * (1 + ageDecayAdjustment);
  } else {
    return 0;
  }
}

function createMapNodes(mapInstance, timestampsArray, arrayIndex) {
  var events = getEventWrappers(timestampsArray, arrayIndex);

  mapInstance.selectAll(".kill-event")
    .data(events)
    .enter()
    .append("circle")
    .attr("class", "kill-event")
    .attr("cx", lat)
    .attr("cy", lon)
    .attr("r", radiusFunction)
    .style("opacity", ".35")
    .style("fill", NORMAL_NODE_COLOR);
}

function changeNodeColors() {
  d3.selectAll(".kill-event")
    .style("fill", function(d) {
      if ((venueSelected == "all" || d.venue == venueSelected) && (weaponSelected == "all" || d.weaponTypes.indexOf(weaponSelected) > -1)) {
        return HIGHLIGHTED_NODE_COLOR;
      } else {
        return NORMAL_NODE_COLOR;
      }
    });
}

/*
 * D3 Rendering
 */

//Draw the map of the United States
d3.json("./data/us.json", function(err, us) {
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
d3.json("./data/interactive_map_data.json", function(err, data){
  //remove the spinner after load
  $("#spinner").hide();

  var timestampsArray = createTimestampsArray(data.events, TIME_INTERVAL);
  maximumSlide = timestampsArray.length - 1;

  // Initialize all of the data events on the map to begin with.
  g.selectAll(".kill-event")
    .data(data.events)
    .enter()
    .append("circle")
    .attr("class", "kill-event")
    .attr("cx", lat)
    .attr("cy", lon)
    .attr("r", function(d) {
      if (d.peopleKilled > 0) { return rScale(d.peopleKilled) }
      else { return 0; }
    })
    .style("opacity", ".35")
    .style("fill", NORMAL_NODE_COLOR);

  enableNodeHover();
  changeNodeColors();

  //initialize jquery slider, and call move function on slide, pass value to move()
  $( "#slider" ).slider({
    value: 0,
    min: 0,
    max: maximumSlide,
    step: 1,
    start: function(ev, ui) {
      if (playInterval !== undefined) {
        toggleNodeProgression();
      }
    },
    stop: function(ev, ui) {
      if (playInterval === undefined) {
        toggleNodeProgression();
      }
    },
    slide: function(ev, ui){
      setSlide(ui.value);
    }
  });

  //gets called on every slide, updates size of circle and text element
  function setSlide(i) {
    updateMapNodes(g);
    createMapNodes(g, timestampsArray, i);

    //update position of the slider
    $( "#slider" ).slider( "value", i );
    currentSlide = i;

    var currentTime = timestampsArray[i].date;

    //pass parsed time to moment to return correct format
    var time = moment(currentTime).format("MMMM Do, YYYY");

    //updates current time
    d3.select("#current_time")
      .html(time);

    enableNodeHover();
    changeNodeColors();

  } //END OF UPDATE FUNCTION

  function toggleNodeProgression() {
    if (playInterval !== undefined) {
      clearInterval(playInterval);
      playInterval = undefined;
      $("#play").html("play");
      return;
    }
    $("#play").html("pause");
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
          .text(VENUE_NAME_MAP[d.venue]);

        var weaponNames = [];
        for (var i=0; i<d.weaponTypes.length; i++) {
          weaponNames.push(WEAPON_NAME_MAP[d.weaponTypes[i]]);
        }

        d3.select('#weapon-names')
          .text(weaponNames.join(", "));
      })
      .on("mouseout", function() {
        //Hide the tooltip
        d3.select("#tooltip")
          .style("opacity", 0);
        d3.select(this)
          .style("opacity", ".35")
          .style("stroke-width", "0");
      })
      .on("click", function(d) {
        d3.select("#detailed-info-venue-name").text(d.venueName);
        d3.select("#detailed-info-date").text(d.date);
        d3.select("#detailed-info-city").text(d.city);
        d3.select("#detailed-info-state").text(d.state);
        d3.select("#detailed-info-people-killed").text(d.peopleKilled);
        d3.select("#detailed-info-people-injured").text(d.peopleInjured);
        d3.select("#detailed-info-ground-zero").attr("href", d.googleMapsUrl);
        $("#information-panel").fadeIn(500);
        if (playInterval !== undefined) {
          toggleNodeProgression();
        }
      });
  }

  $('#play').click(toggleNodeProgression);
});
