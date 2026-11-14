
export const environments = {

    spacecraft: {
        name: "Deep Space Transit",
        subtitle: "LONG-DURATION DEEP SPACE MISSION",
        focus: "Radiation exposure and cardiovascular monitoring",
        hazards: [
            "Radiation",
            "Distance from Earth",
            "Isolation"
        ],
        tip: "Monitor radiation exposure, sleep patterns and cardiovascular changes."
    },

    station: {
        name: "Space Station",
        subtitle: "LOW EARTH ORBIT OPERATIONS",
        focus: "Microgravity adaptation and respiratory monitoring",
        hazards: [
            "Microgravity",
            "CO2 exposure",
            "Isolation"
        ],
        tip: "Monitor fluid shifts, exercise, respiratory comfort and bone health."
    },

    rover: {
        name: "Planetary Rover",
        subtitle: "EXPLORATION OPERATIONS",
        focus: "Vibration, dust and confined-environment exposure",
        hazards: [
            "Vibration",
            "Dust",
            "Confinement"
        ],
        tip: "Monitor fatigue, hydration and environmental exposure."
    },

    mars: {
        name: "Mars Base",
        subtitle: "PLANETARY SURFACE OPERATIONS",
        focus: "Reduced gravity, radiation and isolation",
        hazards: [
            "Reduced gravity",
            "Radiation",
            "Isolation",
            "Dust"
        ],
        tip: "Prioritize bone health, exercise, nutrition and behavioral wellbeing."
    }

};

export function getEnvironment(id) {
    return environments[id] || environments.spacecraft;
}
