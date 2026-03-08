def get_tod(body_temp, ambient_temp, discov_h, discov_m):
    # using simplified Glaister Equation
    # Hours since death = (ambient - current_temp) / 0.75 or depending on temperature
    if ambient_temp < 15:
        rate = 1.1
    elif ambient_temp > 27:
        rate = 0.5
    else:
        rate = 0.83
    
    time_passed = (36.9 - body_temp) / rate
    death_time = discov_h + discov_m/60 - time_passed
    
    # clock
    day = 0
    while death_time < 0:
        death_time += 24
        day += 1

    # convert
    hours = int(death_time)
    minutes = round((death_time - hours) * 60)
    # Fix edge case where rounding 59.9 becomes 60
    if minutes == 60:
        hours += 1
        minutes = 0
    
    return hours, minutes, day

# print(get_tod(21, 11, 14, 15))