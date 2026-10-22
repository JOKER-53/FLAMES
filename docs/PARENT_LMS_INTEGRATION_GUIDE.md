# FLAMES / FortiSim & PAN-Sim - Parent LMS Integration Guide

This guide explains how to integrate **FortiSim / PAN-Sim** into your parent project (**Incogn1tr1x-Academy** / your college server deployment) as an embedded or linked interactive simulator, where:
1. **Authentication (Login/Register/JWT)** is handled exclusively by the parent LMS project.
2. **Progress & Scoring** are relayed directly back to the parent LMS.

---

## 🎯 Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │       Incogn1tr1x-Academy (Parent LMS Application)       │
 │   - Handles User Login / Auth (Student / Instructor)   │
 │   - Manages Courses, Modules, Labs & Leaderboards       │
 │   - Stores Student Completion & Scores                  │
 └─────────────┬─────────────────────────────▲─────────────┘
               │ Launch Lab                  │ Progress Events
               │ (Iframe or Redirect)        │ (postMessage or Webhook)
               ▼                             │
 ┌───────────────────────────────────────────┴─────────────┐
 │           FortiSim / PAN-Sim Lab Container              │
 │   - Runs Fortinet & Palo Alto Simulation UI             │
 │   - Evaluates rule logic via @fortisim/engine           │
 │   - Knowledge Check MCQ (LLM + Offline Fallbacks)       │
 └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Option 1: Iframe + `postMessage` (Recommended for Seamless Embedding)

You can embed the simulator directly inside an Incogn1tr1x-Academy lab page using an `<iframe>`.

### 1. In Incogn1tr1x-Academy (Parent React/Vue/HTML Page):
```html
<iframe
  id="fortisim-lab-frame"
  src="http://your-server-ip:5173/fortigate?parent=true&userId=STUDENT_123"
  style="width: 100%; height: 90vh; border: none;"
></iframe>

<script>
  // Listen for score/task completion events from the FortiSim lab
  window.addEventListener("message", async (event) => {
    // Optional: verify event.origin
    if (event.data?.type === "FORTISIM_TASK_COMPLETE") {
      const { platform, taskId, completedCount } = event.data;
      console.log(`Student completed task: ${taskId} on ${platform}`);

      // Call your Incogn1tr1x-Academy backend API to record the score/progress
      await fetch("/api/lms/record-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "STUDENT_123",
          lab: platform,
          taskId: taskId,
          timestamp: new Date().toISOString()
        })
      });
    }
  });
</script>
```

### 2. Supported `postMessage` Events Emitted by FortiSim:
When a task is successfully completed (either through valid policy configuration or by answering the Knowledge Check), FortiSim emits:
```json
{
  "type": "FORTISIM_TASK_COMPLETE",
  "platform": "fortigate" | "paloalto",
  "taskId": "web-server-access-01",
  "completedCount": 4
}
```

---

## 🔗 Option 2: Direct Redirect with Return Callback / Webhook

If opening in a new tab rather than an iframe:
1. Student clicks **"Open Lab"** in Incogn1tr1x-Academy.
2. Link navigates to:
   ```
   http://your-server-ip:5173/fortigate?userId=USER_ID&callback=https://academy.edu/api/labs/complete
   ```
3. When finished, a "Return to Academy" button submits progress back to your callback URL and redirects the student back to the Academy dashboard.

---

## 🤖 Knowledge Check & AI Tutor Configuration (NVIDIA NIM / OpenAI Fallback)

To ensure the Knowledge Check and AI Tutor never show 500 errors even if NVIDIA NIM is down, configure your backend environment (`packages/backend/.env`):

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173,https://your-academy-domain.com

# 1. OpenAI (Alternative to NIM)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# 2. Or NVIDIA NIM
NVIDIA_NIM_API_KEY=nvapi-...
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct

# 3. Disabling Internal Auth (Since parent LMS handles auth)
AUTH_REQUIRED=false
ALLOW_REGISTRATION=false
```

> **Note on Zero-Downtime:** If no API keys are provided or if the AI provider times out/fails, the system **automatically falls back to curated static questions from `@fortisim/engine`**, guaranteeing that students are never blocked by API issues.
