
const astronauts = [
    {
        id: "AH-001",
        name: "Alex Morgan",
        role: "Commander",
        mission: "ORBIT-01",
        points: 1250,
        readiness: 96
    },
    {
        id: "AH-002",
        name: "Sarah Chen",
        role: "Medical Officer",
        mission: "ORBIT-01",
        points: 1180,
        readiness: 92
    },
    {
        id: "AH-003",
        name: "James Wilson",
        role: "Pilot",
        mission: "ORBIT-01",
        points: 980,
        readiness: 88
    },
    {
        id: "AH-004",
        name: "Maya Patel",
        role: "Flight Engineer",
        mission: "ORBIT-01",
        points: 1100,
        readiness: 94
    }
];

const profiles = {
    "AH-001": {
        heart_rate: 72,
        spo2: 98,
        temperature: 36.7,
        blood_pressure: "118/78",
        glucose: 92,
        sleep: 7.5,
        mood: "Good"
    },
    "AH-002": {
        heart_rate: 76,
        spo2: 99,
        temperature: 36.6,
        blood_pressure: "116/76",
        glucose: 88,
        sleep: 8,
        mood: "Excellent"
    },
    "AH-003": {
        heart_rate: 80,
        spo2: 97,
        temperature: 36.8,
        blood_pressure: "120/80",
        glucose: 96,
        sleep: 7,
        mood: "Good"
    },
    "AH-004": {
        heart_rate: 74,
        spo2: 98,
        temperature: 36.5,
        blood_pressure: "114/74",
        glucose: 90,
        sleep: 8.2,
        mood: "Excellent"
    }
};

let scenario = "normal";

function vary(value, amount = 1) {
    return Number(
        (value + (Math.random() - 0.5) * amount).toFixed(1)
    );
}

export function setMockScenario(mode) {
    scenario = mode;
}

export function getMockCrew() {
    return astronauts.map(person => ({ ...person }));
}

export function getMockVitals(astronautId = "AH-001") {

    const profile = profiles[astronautId] || profiles["AH-001"];

    let values = { ...profile };

    values.heart_rate = vary(values.heart_rate, 2);
    values.spo2 = vary(values.spo2, 0.4);
    values.temperature = vary(values.temperature, 0.2);
    values.glucose = vary(values.glucose, 2);
    values.sleep = vary(values.sleep, 0.2);

    if (scenario === "warning") {
        values.heart_rate = 105;
        values.spo2 = 94;
        values.temperature = 37.7;
    }

    if (scenario === "critical") {
        values.heart_rate = 132;
        values.spo2 = 89;
        values.temperature = 39.1;
    }

    return {
        astronaut_id: astronautId,
        heart_rate: values.heart_rate,
        spo2: values.spo2,
        temperature: values.temperature,
        blood_pressure: values.blood_pressure,
        glucose: values.glucose,
        sleep: values.sleep,
        mood: values.mood,
        timestamp: new Date().toISOString(),
        data_source: "SIMULATED"
    };
}

export function getMockStatus() {

    const statuses = {
        normal: {
            overall: "NORMAL",
            color: "GREEN"
        },
        warning: {
            overall: "WARNING",
            color: "ORANGE"
        },
        critical: {
            overall: "CRITICAL",
            color: "RED"
        }
    };

    return {
        ...statuses[scenario],
        indicators: {
            heart_rate: scenario === "normal" ? "GREEN" : scenario === "warning" ? "ORANGE" : "RED",
            spo2: scenario === "normal" ? "GREEN" : scenario === "warning" ? "YELLOW" : "RED",
            temperature: scenario === "normal" ? "GREEN" : scenario === "warning" ? "YELLOW" : "RED"
        },
        message: "Illustrative simulated health status."
    };
}

export function getMockAlerts() {

    if (scenario === "normal") {
        return [];
    }

    return [{
        id: "ALT-001",
        indicator: "Heart Rate",
        severity: scenario === "critical" ? "RED" : "ORANGE",
        message: scenario === "critical"
            ? "Heart rate is significantly elevated."
            : "Heart rate is above the illustrative baseline.",
        timestamp: new Date().toISOString(),
        acknowledged: false
    }];
}

export function getMockGuidance(indicator) {

    const guidance = {
        heart_rate: {
            title: "Heart Rate",
            explanation: "Heart rate measures the number of heartbeats per minute.",
            measurement: "Use an approved pulse sensor or measure the pulse according to onboard medical procedures.",
            actions: [
                "Repeat the measurement after resting.",
                "Record symptoms and activity.",
                "Follow mission medical protocols."
            ]
        },

        spo2: {
            title: "Blood Oxygen Saturation",
            explanation: "SpO2 estimates the percentage of oxygen-carrying hemoglobin in the blood.",
            measurement: "Use an approved pulse oximeter according to its instructions.",
            actions: [
                "Check sensor placement.",
                "Repeat the reading.",
                "Report persistent abnormal readings."
            ]
        },

        temperature: {
            title: "Body Temperature",
            explanation: "Temperature helps identify changes in body heat regulation.",
            measurement: "Use the approved medical thermometer.",
            actions: [
                "Repeat the measurement.",
                "Record associated symptoms.",
                "Follow medical instructions."
            ]
        }
    };

    return guidance[indicator] || {
        title: indicator,
        explanation: "This indicator supports astronaut health monitoring.",
        measurement: "Use approved onboard measurement equipment.",
        actions: [
            "Repeat unusual measurements.",
            "Record relevant symptoms.",
            "Follow mission medical procedures."
        ]
    };
}

export function getMockHistory(astronautId = "AH-001") {
    return Array.from({ length: 30 }, (_, index) => {
        const reading = getMockVitals(astronautId);

        return {
            ...reading,
            heart_rate: vary(72, 7),
            spo2: vary(98, 1),
            temperature: vary(36.7, 0.3),
            timestamp: new Date(
                Date.now() - (29 - index) * 2500
            ).toISOString()
        };
    });
}

export function getMockData(path) {

    const url = new URL(path, window.location.origin);
    const endpoint = url.pathname;
    const astronaut = url.searchParams.get("astronaut") || "AH-001";

    if (endpoint === "/api/health-check") {
        return {
            success: true,
            backend: "MOCK",
            data_source: "SIMULATED"
        };
    }

    if (endpoint === "/api/crew") {
        return { success: true, data: getMockCrew() };
    }

    if (endpoint === "/api/vitals/latest") {
        return {
            success: true,
            data: getMockVitals(astronaut),
            readings_stored: 128,
            data_source: "SIMULATED"
        };
    }

    if (endpoint === "/api/vitals/history") {
        return {
            success: true,
            data: getMockHistory(astronaut)
        };
    }

    if (endpoint === "/api/status") {
        return { success: true, data: getMockStatus() };
    }

    if (endpoint === "/api/alerts") {
        return {
            success: true,
            data: getMockAlerts()
        };
    }

    if (endpoint.startsWith("/api/guidance/")) {
        const indicator = endpoint.split("/").pop();

        return {
            success: true,
            data: getMockGuidance(indicator)
        };
    }

    if (endpoint === "/api/baseline") {
        return {
            success: true,
            data: {
                heart_rate: 72,
                spo2: 98,
                temperature: 36.7,
                glucose: 92,
                sleep: 7.5
            }
        };
    }

    if (endpoint === "/api/scenario" || endpoint === "/api/delay") {
        return {
            success: true,
            data_source: "SIMULATED"
        };
    }

    return {
        success: true,
        data: [],
        data_source: "SIMULATED"
    };
}
