import csv
import re
import json

DATE_HEADER = "date"
VENUE_TYPE_HEADER = "venueType"
VENUE_NAME_HEADER = "venueName"
CITY_HEADER = "city"
STATE_HEADER = "state"
PEOPLE_KILLED_HEADER = "peopleKilled"
PEOPLE_INJURED_HEADER = "peopleInjured"
URL_HEADER = "googleMapsUrl"
WEAPON_HEADERS = ["pistol","rifle","shotgun","unknownGun","explosive","knife","nonMetallicObject"]

def read_filename(filename):
    matrix = []
    headers = None
    with open(filename, 'r') as f:
        reader = csv.reader(f, delimiter=",")
        for row in reader:
            if headers == None:
                headers = row
            else:
                matrix.append(row)
        return (matrix, headers)

def get_column_index(headers, column_name):
    for i in xrange(len(headers)):
        if headers[i] == column_name:
            return i
    raise TypeError("Column name '%s' not found in headers" % column_name)

def convert_to_lat_long(data_matrix, column_index):
    lat_long_result = []
    for row in data_matrix:
        url = row[column_index]
        match = re.search("www\.google\.com\/maps\/place\/.*?\/@(.*?),(.*?),.*?\/data=", url)
        if match == None:
            lat_long_result.append((None, None))
        else:
            lat_long_result.append((match.group(1), match.group(2)))
    return lat_long_result

def create_weapon_type_map(headers, weapon_headers):
    type_map = {}
    for weapon in weapon_headers:
        type_map[weapon] = headers.index(weapon)
    return type_map

def get_weapon_types(row, weapon_type_map):
    weapon_types = []
    for weapon_type, index in weapon_type_map.iteritems():
        if int(row[index]) > 0:
            weapon_types.append(weapon_type)
    return weapon_types

def write_to_json_file(events, output_filename):
    json_dictionary = {
        "events": events
        }

    with open(output_filename, 'w') as f:
        json.dump(json_dictionary, f)

def convert_to_json(filename, output_filename):
    data_matrix, headers = read_filename(filename)
    url_column_index = get_column_index(headers, URL_HEADER)
    lat_long_data = convert_to_lat_long(data_matrix, url_column_index)

    date_column = get_column_index(headers, DATE_HEADER)
    venue_type_column = get_column_index(headers, VENUE_TYPE_HEADER)
    venue_name_column = get_column_index(headers, VENUE_NAME_HEADER)
    city_column = get_column_index(headers, CITY_HEADER)
    state_column = get_column_index(headers, STATE_HEADER)
    people_killed_column = get_column_index(headers, PEOPLE_KILLED_HEADER)
    people_injured_column = get_column_index(headers, PEOPLE_INJURED_HEADER)
    weapon_type_map = create_weapon_type_map(headers, WEAPON_HEADERS)

    events = []
    for i in xrange(len(data_matrix)):
        new_event = {
            "latitude": lat_long_data[i][0],
            "longitude": lat_long_data[i][1],
            "date": data_matrix[i][date_column],
            "venue": data_matrix[i][venue_type_column],
            "venueName": data_matrix[i][venue_name_column],
            "city": data_matrix[i][city_column],
            "state": data_matrix[i][state_column],
            "peopleKilled": data_matrix[i][people_killed_column],
            "peopleInjured": data_matrix[i][people_injured_column],
            "googleMapsUrl": data_matrix[i][url_column_index],
            "weaponTypes": get_weapon_types(data_matrix[i], weapon_type_map)
            }
        events.append(new_event)

    write_to_json_file(events, output_filename)

if __name__ == '__main__':
    import os
    raw_filename = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/raw_data.csv'))
    output_filename = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/interactive_map_data.json'))

    convert_to_json(raw_filename, output_filename)
