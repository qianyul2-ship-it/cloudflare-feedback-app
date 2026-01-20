# Cloudflare Feedback Dashboard (PM Intern Assignment)

This repository contains a lightweight prototype built for the **Cloudflare Product Manager Intern Assignment (Summer 2026)**.

The goal of this project is **not** to build a full production-ready product, but to explore how Cloudflare’s Developer Platform supports building a real feedback analysis workflow—and to surface product friction encountered during that process.

---

## 🔍 What This Prototype Does

This prototype demonstrates a **feedback analysis dashboard** for product teams:

- Feedback entries are manually added (mock data)
- A simple dashboard displays a feedback inbox
- **Workers AI** is used to analyze feedback and generate:
  - Categories
  - Sentiment
  - Urgency signals
- Insights are stored and queried via **Cloudflare D1**

The focus is on **workflow exploration and developer experience**, rather than full SaaS integrations.

---

## 🧱 Architecture Overview

The system uses a fully serverless architecture on Cloudflare:

- **Cloudflare Workers**  
  Acts as both the frontend server and backend logic layer.

- **Workers AI** (`@cf/meta/llama-3-8b-instruct`)  
  Used to analyze raw feedback text and generate structured insights.

- **Cloudflare D1**  
  A serverless SQL database used to store feedback and AI-generated metadata with schema constraints.

- **Workers Assets**  
  Used to serve the static dashboard UI directly from the Worker.

---

## 🌐 Live Demo

👉 **Live Prototype:**  
https://my-feedback-dashboard.qianyul2.workers.dev/

---

## 📁 Repository Structure (High-Level)
.
├── src/ # Worker entry and routing logic
├── public/ # Static assets for the dashboard UI (if used)
├── migrations/ # D1 schema and migrations
├── wrangler.toml # Cloudflare configuration and bindings
└── README.md

## ⚠️Disclaimer
This project was built as part of a time-boxed assignment.
Some aspects (manual data input, mock data, limited UI) are intentional to focus on platform evaluation rather than feature completeness.

