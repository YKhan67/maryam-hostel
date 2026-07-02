# 🚀 Maryam Hostel Management System - Upgrade Roadmap

This document tracks the planned professional upgrades and feature enhancements for the Maryam Hostel platform.

---

## ✅ Completed Phases (Foundation)

*   **Phase 1: Security & Portability**: Implemented `.env` environment variables, removed hardcoded paths, and established API versioning.
*   **Phase 2: Performance Reporting**: Refactored dashboard logic to use high-performance Database Aggregation and implemented initial Role Isolation.
*   **Phase 3: Scalability**: Integrated Celery & Redis for asynchronous background tasks (WhatsApp notifications and heavy fee generation).
*   **Phase 4: UI/UX Modernization**: Redesigned the landing page and management portal with a premium, smart device-aware layout (adapts to Laptop, Tablet, and Phone).

---

## 📋 Pending Modules (Product Backlog)

### 1. Workforce Management & SLA (Service Level Agreements)
*   **Objective**: Automate student-staff communication and enforce operational accountability.
*   **Key Features**:
    *   **Intelligent Routing**: Automated routing of incoming student WhatsApp requests to specific departments (Maintenance, Accounts, Management).
    *   **SLA Monitoring**: Real-time tracking of response times (e.g., 3h for repairs, 5h for fee approvals).
    *   **Auto-Escalation**: Automated WhatsApp alerts to Supervisors/Warden if staff miss their deadlines. (Accountant reminders include Manager in CC).
    *   **Customizable Timings**: Admin interface to adjust response time limits per category.
*   **Pro Suggestions**: 
    *   **Interactive Buttons**: Use WhatsApp "Quick Reply" buttons for common student requests.
    *   **Staff Action Center**: A dedicated "Task List" for staff to mark jobs as "Fixed" or "In Progress."
    *   **Real-time SLA Dashboard**: A live view for the Warden to see currently "at risk" tickets.

### 2. Smart Inventory & Procurement Intelligence
*   **Objective**: Move from manual logging to predictive stock management and cost optimization.
*   **Key Features**:
    *   **Low Stock Alerts**: "Re-order Levels" for every item with automatic WhatsApp reminders to the purchaser.
    *   **Usage Analytics**: Dashboard to detect "Abnormal Consumption" (spikes in usage vs. historical averages).
    *   **Price Comparison Engine**: Automated tracking of which vendors are cheapest for specific goods based on history.
    *   **Smart Re-order Sheet**: One-click purchasing list showing quantity, best vendor, and "Last Bought Price".
*   **Pro Suggestions**: 
    *   **Digital Stock Audit**: A monthly tool to "true-up" digital records with physical shelf counts.
    *   **Purchase Approval Workflow**: Requirement for managers to digitally approve orders before they are placed.
    *   **FIFO Expiry Tracking**: Automated alerts for perishable items reaching their use-by dates.
    *   **Direct Vendor WhatsApp**: One-click ordering that sends a PDF purchase order directly to the vendor.

### 3. Visual Proof & Audit System
*   **Objective**: Ensure 100% transparency and zero leakage in inventory movements.
*   **Key Features**:
    *   **Consumption Proof**: Mandatory photo upload for every item taken from the store, including quantity and timestamp metadata.
    *   **Procurement Proof**: Mandatory photo upload of both the physical Invoice and the items received at the gate.
    *   **Visual History Log**: A scrolling audit gallery for management to verify stock movements visually for any suspicious transaction.
*   **Pro Suggestions**: 
    *   **AI OCR Receipt Reading**: Automated data entry from invoice photos to save time and reduce errors.
    *   **QR-Coded Shelves**: Scan-and-snap logic for staff to quickly log stock removals.
    *   **Warden "Four-Eye" Verification**: Requirement for the Warden to verify procurement photos upon delivery.

### 4. Multi-Branch Isolation & Investor Portal
*   **Objective**: Scale the operation across multiple branches and investors with strict data security.
*   **Key Features**:
    *   **100% Data Isolation**: Technical "Walls" preventing Managers/Partners of Branch A from seeing any data from Branch B.
    *   **Super-Admin Master View**: Executive dashboard showing Global Profitability vs. Branch-specific performance.
    *   **"Partner" Role**: Dedicated access level for investors to view PnL, Inventory Value, and Occupancy for their specific branch only.
*   **Pro Suggestions**: 
    *   **One-Click PnL Export**: Professional PDF/Excel financial reports for investors.
    *   **Overhead Cost Splitting**: Proportionally distribute shared marketing or office costs across all branches.
    *   **Branch Performance Leaderboard**: Ranking branches by profitability and cost-efficiency to identify training needs.
    *   **Global Audit Logs**: Comprehensive history of every modification made across the entire hostel chain.

---
*Last Updated: June 2026*
