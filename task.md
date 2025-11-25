# Fullstack Integrations Take-Home Project

## Goal

This fullstack integrations take-home project is designed to evaluate your ability to tackle real-world challenges similar to those you would encounter in our engineering roles. Beyond gauging your technical skills, we aim to understand your problem-solving approach, creativity, clarity of documentation, and your ability to articulate your decisions. The solution method for this project is intentionally left open-ended, to give you the room to showcase these facets.

**Estimated Time:** You are expected to spend around 4-6 hours, but feel free to go over as you wish.

---

## Introduction

Acme Corp. is negotiating a multi-billion dollar acquisition and wants to conduct due diligence by placing all the relevant documents in a virtual Data Room. A Data Room is an organized repository for securely storing and distributing documents. You can take inspiration from Google Drive for UI/UX where the Data Room is the top-level folder or drive. Users can usually import files from other file systems into a Data Room.

This Dataroom you are building should be able to connect with Google Drive via OAuth and allow importing files from Google Drive into the data room.

Our goal is to develop a **Data Room Software MVP** that works well out of the box. We ask that you optimize for (in this order):

1. Robustness, scalability and security
2. User experience and functionality
3. Code quality and readability

---

## Instructions

### Technical Requirements

**Build a basic Dataroom frontend, single page application:**

- You may use any React based frameworks (we use React / TypeScript / Tailwind / Shadcn for our client)
- Users go through a UI flow to authenticate with Google Drive
- Users can select files on the UI to import, you may use Google Drive file picker out of the box or create your own picker
- Users are allowed to import files from Google Drive in the UI, and these are displayed in UI

**Build a basic dataroom backend to support functional requirements:**

- You can use any Python framework (we use Flask / Python / Postgres for our backend)
- Store metadata in a DB to persist files and application state across page refreshes and user sessions. You can use any DB
- Store OAuth tokens and persist files on server disk (no need to use blob etc)

**You can use AI to write code.**

**Your solution should work end to end locally.**

### Design Considerations

While designing your solution, think of:

- Good data model design to support functional requirements
- Handle OAuth and token storage in backend
- Clean and intuitive UI/UX
- Edge cases, ex: using an expired OAuth token

---

## Functional Requirements

Below is the main CRUD functionality you should build:

### File Management

- Import files from Google Drive into dataroom
- View file list in UI
- Click on file to view in browser
- Delete a file imported into Dataroom (not in Google Drive)

### Optional (Extra Credit)

We ask that you time-box your solution and only attempt the below if you have time remaining:

- You can add an authentication layer using social auth or user/password
- You can add search and filtering features that allows users to search for documents based on contents or file names

---

## Deliverables

1. **code.zip (required):** A GitHub repo with your code and a README discussing your design decisions and clear setup instructions
2. **URL:** Publicly hosted URL for the project, you can use free services like Render, Linode, Vercel etc
3. **Screenshots or a video walkthrough** of anything you're proud of building in this assignment

---

## React Setup Guide

If you would like to use full-stack frameworks, please see [Creating a React App](https://react.dev/learn/creating-a-react-app) for details. You can leverage:

- **Next.js (App Router):** `npx create-next-app@latest`
- **React Router (v7):** `npx create-react-router@latest` — [See templates](https://react.dev/learn/creating-a-react-app)

If you want to start more from scratch, please see [Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch) and choose any of the following:

- **Vite:** `npm create vite@latest my-app -- --template react`
- **Parcel:** `npm install --save-dev parcel`
- **Rsbuild:** `npx create-rsbuild --template react`

### Old School (with the sunsetted create-react-app)

Here are the steps to set up a React single-page application using a template:

1. **Install npm:** npm is a package manager that will allow you to install JavaScript packages that your application may require.
2. **Create a new React application:** You can do this by running `npx create-react-app app-name` in your terminal. Replace "app-name" with the name you want to give to your application.
3. **Navigate to your new application:** Use the command `cd app-name` to go to your application's directory.
4. **Start the application:** Run `npm start` to start the application. Your application should now be running at `http://localhost:3000` in your web browser.