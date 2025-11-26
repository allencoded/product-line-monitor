# API Examples

Sample curl and HTTP requests for Production Line Monitor API.

## Setup

```bash
# Set environment variables for easier usage
export API_URL="http://localhost:3000/api"
export API_KEY="your-secret-api-key-here"

# Or for production
# export API_URL="https://api.production-line-monitor.com/api"
```

## Authentication

All webhook endpoints require API key authentication:

```bash
curl -H "X-API-Key: $API_KEY" $API_URL/equipment
```

---

## Webhooks

### 1. Ingest Sensor Data (Single Equipment)

```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 85.5,
        "unit": "°C",
        "timestamp": "2025-11-20T10:30:00Z"
      },
      {
        "equipmentId": "pump-001",
        "sensorType": "VIBRATION",
        "value": 2.1,
        "unit": "mm/s",
        "timestamp": "2025-11-20T10:30:00Z"
      }
    ]
  }'
```

**Response:**
```json
{
  "message": "Sensor data accepted for processing",
  "accepted": 2,
  "jobId": "1234567890",
  "timestamp": "2025-11-20T10:30:01.234Z"
}
```

### 2. Ingest Sensor Data (Multiple Equipment)

```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 85.5,
        "unit": "°C"
      },
      {
        "equipmentId": "conveyor-002",
        "sensorType": "VIBRATION",
        "value": 1.8,
        "unit": "mm/s"
      },
      {
        "equipmentId": "press-003",
        "sensorType": "PRESSURE",
        "value": 145.2,
        "unit": "bar"
      }
    ]
  }'
```

### 3. Ingest Anomalous Data (Temperature Spike)

```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 150.0,
        "unit": "°C"
      }
    ]
  }'
```

### 4. Check Webhook Job Status

```bash
# Save job ID from webhook response
JOB_ID="1234567890"

curl -X GET "$API_URL/webhook/status/$JOB_ID" \
  -H "X-API-Key: $API_KEY"
```

**Response:**
```json
{
  "jobId": "1234567890",
  "name": "process-batch",
  "state": "completed",
  "progress": 100,
  "result": {
    "processed": 2,
    "anomaliesDetected": 0
  },
  "failedReason": null,
  "timestamp": "2025-11-20T10:30:05.123Z"
}
```

---

## Equipment

### 5. Get All Equipment

```bash
curl -X GET "$API_URL/equipment"
```

**Response:**
```json
{
  "data": [
    {
      "id": "pump-001",
      "name": "Hydraulic Pump #1",
      "type": "Pump",
      "location": "Assembly Line A",
      "status": "ONLINE",
      "lastHeartbeat": "2025-11-20T10:35:45Z",
      "createdAt": "2025-11-19T08:00:00Z",
      "updatedAt": "2025-11-20T10:35:45Z"
    }
  ],
  "count": 10
}
```

### 6. Get Equipment by Status

```bash
# Get only ONLINE equipment
curl -X GET "$API_URL/equipment?status=ONLINE"

# Get OFFLINE equipment
curl -X GET "$API_URL/equipment?status=OFFLINE"

# Get equipment with ANOMALY status
curl -X GET "$API_URL/equipment?status=ANOMALY"
```

### 7. Get Equipment Status

```bash
curl -X GET "$API_URL/equipment/pump-001/status"
```

**Response:**
```json
{
  "id": "pump-001",
  "name": "Hydraulic Pump #1",
  "type": "Pump",
  "location": "Assembly Line A",
  "status": "ONLINE",
  "lastHeartbeat": "2025-11-20T10:35:45Z",
  "latestReadings": [
    {
      "equipmentId": "pump-001",
      "sensorType": "TEMPERATURE",
      "value": 85.5,
      "unit": "°C",
      "timestamp": "2025-11-20T10:35:45Z"
    },
    {
      "equipmentId": "pump-001",
      "sensorType": "VIBRATION",
      "value": 2.1,
      "unit": "mm/s",
      "timestamp": "2025-11-20T10:35:45Z"
    }
  ],
  "activeAnomalies": 0
}
```

### 8. Get Sensor History (All Sensors)

```bash
curl -X GET "$API_URL/equipment/pump-001/sensor-history"
```

### 9. Get Sensor History (Specific Sensor Type)

```bash
# Temperature only
curl -X GET "$API_URL/equipment/pump-001/sensor-history?sensorType=TEMPERATURE"

# With time range
curl -X GET "$API_URL/equipment/pump-001/sensor-history?sensorType=TEMPERATURE&startTime=2025-11-19T00:00:00Z&endTime=2025-11-20T00:00:00Z"
```

**Response:**
```json
{
  "equipmentId": "pump-001",
  "sensorType": "TEMPERATURE",
  "timeRange": {
    "start": "2025-11-19T00:00:00Z",
    "end": "2025-11-20T00:00:00Z"
  },
  "data": [
    {
      "time": "2025-11-19T10:00:00Z",
      "value": 82.3,
      "unit": "°C",
      "sensorType": "TEMPERATURE"
    }
  ],
  "statistics": {
    "avg": 83.5,
    "min": 78.2,
    "max": 89.1,
    "count": 8640
  },
  "aggregation": "raw"
}
```

---

## Metrics

### 10. Get Production Metrics (Last 24 Hours)

```bash
curl -X GET "$API_URL/metrics/production"
```

**Response:**
```json
{
  "timeRange": {
    "start": "2025-11-19T10:00:00Z",
    "end": "2025-11-20T10:00:00Z"
  },
  "totalEvents": 86400,
  "eventsPerHour": 3600,
  "equipmentCount": 10,
  "anomalyRate": 5.2,
  "anomaliesBySeverity": [
    {
      "severity": "LOW",
      "count": 120
    },
    {
      "severity": "MEDIUM",
      "count": 45
    },
    {
      "severity": "CRITICAL",
      "count": 12
    }
  ],
  "uptimePercentage": 98.5
}
```

### 11. Get Production Metrics (Custom Time Range)

```bash
curl -X GET "$API_URL/metrics/production?startTime=2025-11-15T00:00:00Z&endTime=2025-11-20T00:00:00Z"
```

### 12. Get Production Metrics (Specific Equipment)

```bash
curl -X GET "$API_URL/metrics/production?equipmentId=pump-001"
```

---

## Alerts

### 13. Get Alert History (All Alerts)

```bash
curl -X GET "$API_URL/alerts/history"
```

**Response:**
```json
{
  "data": [
    {
      "id": "anomaly-123",
      "time": "2025-11-20T10:15:30Z",
      "equipmentId": "pump-001",
      "equipmentName": "Hydraulic Pump #1",
      "sensorType": "TEMPERATURE",
      "severity": "CRITICAL",
      "description": "Temperature reading significantly higher than normal",
      "value": 150.5,
      "threshold": 95.0,
      "zScore": 5.8,
      "resolved": false,
      "resolvedAt": null
    }
  ],
  "pagination": {
    "total": 177,
    "page": 1,
    "pageSize": 50,
    "totalPages": 4
  }
}
```

### 14. Get Alert History (Filtered by Severity)

```bash
# Critical alerts only
curl -X GET "$API_URL/alerts/history?severity=CRITICAL"

# Medium severity
curl -X GET "$API_URL/alerts/history?severity=MEDIUM"

# Low severity
curl -X GET "$API_URL/alerts/history?severity=LOW"
```

### 15. Get Alert History (Filtered by Equipment)

```bash
curl -X GET "$API_URL/alerts/history?equipmentId=pump-001"
```

### 16. Get Alert History (Filtered by Sensor Type)

```bash
curl -X GET "$API_URL/alerts/history?sensorType=TEMPERATURE"
```

### 17. Get Alert History (Unresolved Alerts Only)

```bash
curl -X GET "$API_URL/alerts/history?resolved=false"
```

### 18. Get Alert History (Multiple Filters + Pagination)

```bash
curl -X GET "$API_URL/alerts/history?severity=CRITICAL&resolved=false&page=1&pageSize=20"
```

### 19. Get Alert History (Time Range)

```bash
curl -X GET "$API_URL/alerts/history?startTime=2025-11-19T00:00:00Z&endTime=2025-11-20T00:00:00Z"
```

### 20. Resolve Alert

```bash
curl -X PATCH "$API_URL/alerts/anomaly-123/resolve"
```

**Response:**
```json
{
  "message": "Alert resolved successfully",
  "data": {
    "id": "anomaly-123",
    "resolved": true,
    "resolvedAt": "2025-11-20T10:45:00Z"
  }
}
```

---

## Sensors

### 23. Get Available Sensor Types

```bash
curl -X GET "$API_URL/sensors/types"
```

**Response:**
```json
{
  "data": [
    "TEMPERATURE",
    "VIBRATION",
    "PRESSURE",
    "VOLTAGE"
  ],
  "count": 4
}
```

---

## Advanced Examples

### 24. Bulk Ingest with Timestamps

```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 85.5,
        "unit": "°C",
        "timestamp": "2025-11-20T10:00:00Z"
      },
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 86.2,
        "unit": "°C",
        "timestamp": "2025-11-20T10:01:00Z"
      },
      {
        "equipmentId": "pump-001",
        "sensorType": "TEMPERATURE",
        "value": 87.0,
        "unit": "°C",
        "timestamp": "2025-11-20T10:02:00Z"
      }
    ]
  }'
```

### 25. Monitor Equipment in Real-Time (Polling)

```bash
# Poll equipment status every 5 seconds
watch -n 5 "curl -s $API_URL/equipment/pump-001/status | jq '.status, .activeAnomalies'"
```

### 26. Get Production Dashboard Data

```bash
# Combine multiple requests for a dashboard view
echo "=== Equipment Status ==="
curl -s "$API_URL/equipment" | jq '.data[] | {id, name, status}'

echo -e "\n=== Production Metrics ==="
curl -s "$API_URL/metrics/production" | jq '{eventsPerHour, anomalyRate, uptimePercentage}'

echo -e "\n=== Recent Alerts ==="
curl -s "$API_URL/alerts/history?pageSize=5" | jq '.data[] | {equipmentName, sensorType, value: .value, time}'
```

### 27. Complex Query Example

```bash
# Get all unresolved critical temperature alerts for pump-001 in the last 24 hours
curl -X GET "$API_URL/alerts/history" \
  -G \
  --data-urlencode "equipmentId=pump-001" \
  --data-urlencode "severity=CRITICAL" \
  --data-urlencode "sensorType=TEMPERATURE" \
  --data-urlencode "resolved=false" \
  --data-urlencode "startTime=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --data-urlencode "endTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

## Testing Scenarios

### Scenario 1: Normal Operation

```bash
# 1. Send normal readings
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {"equipmentId": "pump-001", "sensorType": "TEMPERATURE", "value": 85.0, "unit": "°C"},
      {"equipmentId": "pump-001", "sensorType": "VIBRATION", "value": 2.0, "unit": "mm/s"}
    ]
  }'

# 2. Check equipment status (should be ONLINE)
curl -s "$API_URL/equipment/pump-001/status" | jq '.status'

# 3. Check for anomalies (should be 0)
curl -s "$API_URL/equipment/pump-001/status" | jq '.activeAnomalies'
```

### Scenario 2: Anomaly Detection

```bash
# 1. Send anomalous temperature reading
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {"equipmentId": "pump-001", "sensorType": "TEMPERATURE", "value": 150.0, "unit": "°C"}
    ]
  }'

# 2. Wait for processing (5-10 seconds)
sleep 10

# 3. Check equipment status (might be ANOMALY)
curl -s "$API_URL/equipment/pump-001/status" | jq '{status, activeAnomalies}'

# 4. Check alerts for this equipment
curl -s "$API_URL/alerts/history?equipmentId=pump-001" | jq '.data[]'
```

### Scenario 3: Alert Management

```bash
# 1. Get unresolved alerts
ALERT_ID=$(curl -s "$API_URL/alerts/history?resolved=false&limit=1" | jq -r '.data[0].id')

# 2. Resolve the alert
curl -X PATCH "$API_URL/alerts/$ALERT_ID/resolve"

# 3. Verify resolution
curl -s "$API_URL/alerts/history?resolved=true" | jq '.data[] | select(.id=="'$ALERT_ID'")'
```

---

## Error Handling

### Missing API Key
```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -d '{"readings": []}'

# Response: 401 Unauthorized
```

### Invalid Equipment ID
```bash
curl -X GET "$API_URL/equipment/invalid-id/status"

# Response: 404 Not Found
```

### Invalid Sensor Type
```bash
curl -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "readings": [
      {"equipmentId": "pump-001", "sensorType": "INVALID", "value": 100, "unit": "X"}
    ]
  }'

# Response: 400 Bad Request - Validation Error
```

---

## Performance Testing

### Load Test with Apache Bench

```bash
# Create test payload file
cat > payload.json << EOF
{
  "readings": [
    {"equipmentId": "pump-001", "sensorType": "TEMPERATURE", "value": 85.0, "unit": "°C"}
  ]
}
EOF

# Run 1000 requests with 10 concurrent connections
ab -n 1000 -c 10 -T 'application/json' -H "X-API-Key: $API_KEY" -p payload.json "$API_URL/webhook/sensor-data"
```

### Load Test with Custom Script

```bash
# Use built-in load test
npm run load-test:light    # 100 readings/sec
npm run load-test:medium   # 500 readings/sec
npm run load-test:heavy    # 1000 readings/sec
npm run load-test:burst    # 2000 readings/sec
```

---

## Tips

### Using jq for JSON Processing

```bash
# Pretty print
curl -s "$API_URL/equipment" | jq '.'

# Extract specific fields
curl -s "$API_URL/equipment" | jq '.data[] | {name, status}'

# Filter results
curl -s "$API_URL/equipment" | jq '.data[] | select(.status=="OFFLINE")'

# Count items
curl -s "$API_URL/alerts/history" | jq '.pagination.total'
```

### Save Response to File

```bash
curl -X GET "$API_URL/metrics/production" -o metrics.json
```

### Verbose Output (Debugging)

```bash
curl -v -X POST "$API_URL/webhook/sensor-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"readings": []}'
```

### Timing Requests

```bash
curl -w "\nTime: %{time_total}s\n" -X GET "$API_URL/equipment"
```
