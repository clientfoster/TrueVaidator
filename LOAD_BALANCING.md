# Load Balancing and Scaling Guide

This document explains how to deploy the Email Validation System with load balancing for increased capacity and reliability.

## Architecture Overview

The load-balanced deployment includes:
- **Nginx Load Balancer**: Distributes requests across multiple validator instances
- **Multiple Validator Instances**: Process validation requests in parallel
- **Redis**: Shared cache for MX records and validation results
- **Docker Compose**: Orchestrates the multi-container deployment

## Deployment Instructions

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available (2GB per validator instance recommended)

### Starting the Load-Balanced System

1. Build and start all services:
```bash
docker-compose up --build
```

This will start:
- 1 nginx load balancer on port 80
- 3 email validator instances
- 1 Redis instance

2. Access the system through the load balancer:
- API endpoints: `http://localhost/v1/...`
- Web interface: `http://localhost/`
- Admin dashboard: `http://localhost/admin`

### Scaling the System

To add more validator instances:

1. Edit `docker-compose.yml` and add more instances:
```yaml
  email-validator4:
    build: .
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=4
    depends_on:
      - redis
    networks:
      - email-validation-network
```

2. Update the nginx configuration in `nginx.conf`:
```nginx
upstream email_validator_backend {
    ip_hash;
    
    server email-validator1:3000 weight=3;
    server email-validator2:3000 weight=3;
    server email-validator3:3000 weight=2;
    server email-validator4:3000 weight=2;  # New instance
}
```

3. Restart the services:
```bash
docker-compose down
docker-compose up --build
```

### Load Balancing Configuration

The nginx configuration provides:
- **Round-robin distribution**: Requests are distributed among instances
- **IP hash**: Ensures clients are routed to the same instance for session persistence
- **Health checks**: Monitors instance availability
- **Increased upload limits**: Supports large bulk validation requests

### Monitoring Instance Health

Each validator instance exposes a health endpoint:
```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "instance": "1",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "activeJobs": 2
}
```

The nginx load balancer uses this endpoint to determine instance availability.

## Capacity Improvements

With the load-balanced deployment:

1. **Increased Throughput**: Multiple instances process requests in parallel
2. **Higher Email Limits**: Support for up to 100,000 emails per bulk request
3. **Improved Reliability**: Failure of one instance doesn't affect the entire system
4. **Better Resource Utilization**: Load is distributed across multiple containers

## Performance Tuning

### Adjusting Instance Weights

In `nginx.conf`, you can adjust the weights of instances based on their capacity:
```nginx
server email-validator1:3000 weight=3;  # Higher capacity instance
server email-validator2:3000 weight=3;  # Higher capacity instance
server email-validator3:3000 weight=2;  # Lower capacity instance
```

### Memory Considerations

Each validator instance stores jobs in memory. For large bulk jobs, ensure each instance has sufficient memory:
- 1GB RAM per instance for small to medium jobs
- 2GB+ RAM per instance for large jobs with 100,000 emails

### Connection Limits

The system can handle more concurrent connections with multiple instances. Monitor:
- Active job count per instance
- Memory usage per instance
- Response times

## Troubleshooting

### Instance Not Responding

Check instance health:
```bash
curl http://localhost/health
```

If an instance is unhealthy, nginx will automatically stop routing requests to it.

### Bulk Job Processing Slow

1. Check active job count on each instance:
```bash
curl http://localhost/api/stats
```

2. Consider adding more instances if all are at capacity

3. Monitor memory usage to ensure instances aren't running out of resources

### Upload Size Issues

The system is configured to support uploads up to 50MB, which is sufficient for 100,000 email addresses. If you need larger uploads, modify the `client_max_body_size` in `nginx.conf`.

## Production Considerations

For production deployments:

1. **Use a proper database**: Replace in-memory storage with PostgreSQL/MongoDB
2. **Add SSL/TLS**: Configure nginx with SSL certificates
3. **Implement monitoring**: Use tools like Prometheus/Grafana for metrics
4. **Add logging aggregation**: Centralize logs from all instances
5. **Use a container orchestrator**: Consider Kubernetes for more advanced deployments