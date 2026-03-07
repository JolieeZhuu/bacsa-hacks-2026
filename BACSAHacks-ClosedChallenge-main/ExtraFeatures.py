def get_tod(body_temp, ambient_temp, discov_h, discov_m):
    # using simplified Glaister Equation
    # Hours since death = (98.6 - current_temp) / 1.5
    time_passed = (98.6 - body_temp) / 1.5
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

# print(get_tod(0, 21, 2, 14))