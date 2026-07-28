/*
=========================================================
 Maddy Executive Operating System (MEOS)
 Executive Inbox v1.0.0
=========================================================
*/

class ExecutiveInbox {

    constructor() {
        this.queue = [];
        console.log("Executive Inbox initialized.");
    }

    receive(title, description, priority = "P3") {

        const mission = {
            id: this.generateMissionId(),
            title: title,
            description: description,
            priority: priority,
            status: "NEW",
            received: new Date().toISOString()
        };

        this.queue.push(mission);

        console.log("New Mission Received:", mission);

        return mission;
    }

    generateMissionId() {

        const number = String(this.queue.length + 1).padStart(6, "0");

        return `M-${number}`;
    }

    getQueue() {
        return this.queue;
    }

    nextMission() {

        if (this.queue.length === 0) {
            return null;
        }

        return this.queue.shift();
    }

    clear() {
        this.queue = [];
    }

}

window.ExecutiveInbox = new ExecutiveInbox();
