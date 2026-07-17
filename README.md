# GATEHUB

**Live demo:** [https://gatehub-r79p.onrender.com/dashboard.html](https://gatehub-r79p.onrender.com/dashboard.html)<br>
**Live gateway:** [https://gatehub-r79p.onrender.com/](https://gatehub-r79p.onrender.com/)

A lightweight API Gateway built from scratch in Node.js and Express — implementing reverse proxy routing, round-robin load balancing, automatic health-check-based failover, and per-client rate limiting, with request logging and live monitoring endpoints. Fully containerized with Docker Compose.

This project was built to understand and demonstrate the core mechanics behind API gateways used in real-world distributed systems — without relying on existing gateway frameworks (like Kong or Spring Cloud Gateway) to do the work invisibly.

---

## Table of contents

- [Why this project](#why-this-project)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [API endpoints](#api-endpoints)
- [Demo: automatic failover](#demo-automatic-failover)
- [Demo: rate limiting](#demo-rate-limiting)
- [What I learned](#what-i-learned)
- [Possible future improvements](#possible-future-improvements)

---

## Why this project

In real distributed systems, a single service is rarely just "one server." Multiple instances of the same service typically run in parallel for reliability and to handle load — and clients shouldn't need to know about any of that complexity. They should just talk to one address and trust that their request reaches a healthy instance.

An API Gateway is the component that makes this possible. It sits between clients and backend services and handles:

- **Routing** — directing requests to the correct service
- **Load balancing** — spreading requests across multiple instances of that service
- **Resilience** — detecting failed instances and avoiding them automatically
- **Protection** — preventing any single client from overwhelming the system

This project implements each of these pieces from first principles, to build a real understanding of how gateways work under the hood, rather than treating it as a black box provided by a framework.

---

## Features

- **Reverse proxy routing** — every incoming request is forwarded to the appropriate backend service instance
- **Round-robin load balancing** — requests are distributed evenly across all currently healthy instances of a service
- **Automatic health checks and failover** — a background process pings each instance's `/health` endpoint every 5 seconds; unhealthy instances are automatically removed from the load-balancing rotation and re-added once they recover, with no manual intervention or restart required
- **Per-client rate limiting** — each client IP is limited to a fixed number of requests per time window; requests beyond the limit receive a `429 Too Many Requests` response
- **Request and response-time logging** — every request is logged with its method, path, the backend instance it was routed to, the response status code, and the total time taken
- **Live monitoring endpoints** — `/gateway/status` and `/gateway/stats` expose real-time system state (healthy instances, uptime, request counts) without needing to read log files
- **Environment-based configuration** — backend instance addresses and ports are configurable via environment variables, so the identical codebase runs unchanged whether tested locally or inside Docker containers
- **Docker Compose deployment** — the entire system (gateway + multiple backend instances) starts with a single command, with Docker handling inter-service networking automatically

---

## Architecture

```
                         ┌─────────────┐
                         │   Client    │
                         └──────┬──────┘
                                │
                                ▼
                      ┌───────────────────┐
                      │    API Gateway    │
                      │  (port 9000)      │
                      │                   │
                      │  1. Request logger│
                      │  2. Rate limiter  │
                      │  3. Load balancer │
                      │     (round robin) │
                      └─────┬─────────┬───┘
                            │         │
                 ┌──────────┘         └──────────┐
                 ▼                                ▼
      ┌─────────────────────┐        ┌─────────────────────┐
      │  users-service-1    │        |   users-service-2   |
      │  (port 8081)        │        | (port 8082)         |
      └─────────────────────┘        └─────────────────────┘
                 ▲                                ▲
                 └────────────────┬───────────────┘
                                  │
                       ┌────────────────────┐
                       │   Health checker   │
                       │  (pings /health    │
                       │   every 5 seconds) │
                       └────────────────────┘
```

Every request passes through three middleware stages inside the gateway, in order: it is first logged, then checked against the rate limiter, and finally handed to the load balancer, which selects a healthy backend instance using round robin and forwards the request to it.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web framework | Express |
| Reverse proxy | http-proxy-middleware |
| HTTP client (health checks) | Axios |
| Containerization | Docker, Docker Compose |

No external gateway framework (e.g. Kong, Spring Cloud Gateway) is used — routing, load balancing, health checking, and rate limiting are all implemented directly.

---

## Project structure

```
api-gateway-project/
├── dummy-service/
│   └── server.js            # Simple backend service (run as multiple instances)
├── gateway/
│   ├── gateway.js           # Entry point — wires together all middleware
│   ├── healthChecker.js     # Tracks instance health via periodic pings
│   ├── loadBalancer.js      # Round-robin instance selection
│   ├── rateLimiter.js       # Per-IP request throttling
│   ├── logger.js            # Request/response logging middleware
│   └── stats.js             # Tracks total/successful/blocked request counts
├── Dockerfile                # Shared image definition for all services
├── docker-compose.yml        # Defines and networks all containers together
├── package.json
└── README.md
```

Each file in the `gateway/` folder has a single, clearly scoped responsibility — this made the system easier to build, test, and reason about incrementally, and makes it straightforward to explain any one piece in isolation.

---

## Getting started

### Prerequisites

- Node.js (v18+ recommended)
- Docker Desktop (for containerized setup)

### Option A — Run with Docker Compose (recommended)

```bash
docker compose up --build
```

This builds and starts three containers: two backend instances (`users-service-1`, `users-service-2`) and the gateway. The gateway is available at `http://localhost:9000`.

### Option B — Run locally without Docker

In separate terminal windows:

```bash
# Terminal 1
node dummy-service/server.js 8081

# Terminal 2
node dummy-service/server.js 8082

# Terminal 3
node gateway/gateway.js
```

The gateway will be available at `http://localhost:9000`.

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Routed to a backend instance via round-robin load balancing |
| `GET /health` (on each backend instance) | Used internally by the health checker; not typically called directly by clients |
| `GET /gateway/status` | Returns current healthy instances, load balancer type, rate limiter status, and gateway uptime |
| `GET /gateway/stats` | Returns total, successful, and blocked request counts since startup |

Example response from `/gateway/status`:

```json
{
  "healthyInstances": [
    "http://users-service-1:8081",
    "http://users-service-2:8082"
  ],
  "rateLimiterEnabled": true,
  "loadBalancer": "Round Robin",
  "uptime": "5m 32s"
}
```

Example response from `/gateway/stats`:

```json
{
  "totalRequests": 143,
  "successfulRequests": 131,
  "blockedRequests": 12
}
```

---

## Demo: automatic failover

This is the core resilience feature of the gateway — it detects a failed instance and routes around it without any manual action.

1. Start the system and confirm requests alternate between both backend instances
2. Stop one instance:
   ```bash
   docker compose stop users-service-2
   ```
3. Within 5 seconds, the gateway's logs show:
   ```
   http://users-service-2:8082 went DOWN
   ```
4. All subsequent requests are routed only to the remaining healthy instance
5. Restart the stopped instance:
   ```bash
   docker compose start users-service-2
   ```
6. Within 5 seconds, the gateway detects recovery:
   ```
   http://users-service-2:8082 is back UP
   ```
7. Round-robin load balancing resumes across both instances automatically

---

## Demo: rate limiting

1. Send more requests than the configured limit in quick succession
2. The first N requests succeed normally
3. Subsequent requests within the same time window receive:
   ```
   429 Too Many Requests - slow down
   ```
4. Once the time window resets, requests succeed again

---

## What I learned

- How reverse proxies route and forward HTTP requests on behalf of a client
- How round-robin load balancing distributes requests across multiple service instances
- How to implement failure detection and automatic recovery using periodic background health checks
- How to implement rate limiting using a fixed time-window counter per client
- The practical difference between concurrency models: a naive counter is unsafe under Java's multi-threaded request handling and requires atomic operations, whereas the same logic is inherently safe in Node.js due to its single-threaded event loop
- How Docker Compose networks multiple containers together, and how service names resolve as hostnames within that internal network
- The importance of separating configuration (ports, instance addresses) from code, using environment variables, so the same code behaves correctly across different environments

---

## Possible future improvements

- Additional load balancing strategies (least-connections, weighted round robin)
- A simple frontend dashboard visualizing `/gateway/status` and `/gateway/stats` instead of raw JSON
- Basic authentication/authorization middleware
- Circuit breaker pattern for repeatedly failing instances
- Dynamic service discovery instead of a static instance list

---

## Author

**Adarsh Singh**<br>
B.Tech, Information Technology

Built as a systems/backend portfolio project to explore how API gateways work.
