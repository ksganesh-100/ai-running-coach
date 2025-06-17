// **CRITICAL SECURITY WARNING:**
// DO NOT EXPOSE YOUR API KEY IN CLIENT-SIDE JAVASCRIPT IN A PRODUCTION ENVIRONMENT.
// THIS IS FOR LOCAL, EXPERIMENTAL TESTING ONLY.
// FOR SECURE DEPLOYMENT, USE A BACKEND SERVER TO CALL THE GEMINI API.

// Import the GoogleGenerativeAI library (requires your HTML <script> tag to be type="module"
// or for you to use a module bundler like Webpack/Parcel).
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai"; 
// ^^^ This line uses a CDN for simplicity. If you installed via npm, use:
// import { GoogleGenerativeAI } from '@google/generative-ai';


// Replace with your actual API key
const API_KEY = "AIzaSyBUHFr6rqFvPN6oqN25a_vfIXuORlDqnME"; 

const genAI = new GoogleGenerativeAI(API_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const planForm = document.getElementById('planForm');
    const planOutput = document.getElementById('planOutput');
    const trainingPlanDiv = document.getElementById('trainingPlan');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessageDiv = document.querySelector('#error .error-message');

    planForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        // Gather input parameters from the form
        const goal = document.getElementById('goal').value;
        const currentMileage = document.getElementById('currentMileage').value;
        const runningDays = document.getElementById('runningDays').value;
        const peakMileage = document.getElementById('peakMileage').value;
        const workoutTypes = document.getElementById('workoutTypes').value;
        const easyPace = document.getElementById('easyPace').value;
        const targetPace = document.getElementById('targetPace').value;

        // Create an object to hold all parameters for the prompt
        const parameters = {
            goal,
            currentMileage: parseFloat(currentMileage),
            runningDays,
            peakMileage: parseFloat(peakMileage),
            workoutTypes,
            easyPace,
            targetPace
        };

        // Basic validation
        if (!goal || isNaN(parameters.currentMileage) || !runningDays || !easyPace || !targetPace) {
            errorMessageDiv.textContent = "Please fill in all required fields (Goal, Current Weekly Mileage, Running Days, Easy Pace, Target Pace).";
            errorDiv.classList.remove('hidden');
            return;
        }

        // Show loading state and hide previous outputs/errors
        planOutput.classList.add('hidden');
        errorDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        trainingPlanDiv.textContent = ''; // Clear previous plan

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash for speed

            // Construct the prompt using the gathered parameters
            const prompt = `
            Create a 12-week running plan.
            Running Goal: ${parameters.goal}
            Current Weekly Mileage: ${parameters.currentMileage} km
            Running Days: ${parameters.runningDays}
            Peak Weekly Mileage during plan: ${parameters.peakMileage || 'not specified'} km
            Desired Workout Types: ${parameters.workoutTypes || 'interval training, easy runs, long runs, tempo runs'}
            Current Easy Pace: ${parameters.easyPace} min/km
            Target Race Pace for 32k: ${parameters.targetPace} min/km

            **Important Pace Clarification for the AI:**
            - Easy/Long Run Pace should be conversational and slower than the provided easy pace, around ${parseFloat(parameters.easyPace.replace(':', '.')) + 0.5} to ${parseFloat(parameters.easyPace.replace(':', '.')) + 1.0} min/km (e.g., if easy is 7:45, suggest 8:15-8:45).
            - Tempo Pace should be comfortably hard, faster than easy but slower than interval (e.g., ${parseFloat(parameters.easyPace.replace(':', '.')) - 0.5} to ${parseFloat(parameters.easyPace.replace(':', '.')) - 0.25} min/km).
            - Interval Pace should be significantly faster and challenging (e.g., ${parseFloat(parameters.easyPace.replace(':', '.')) - 1.0} to ${parseFloat(parameters.easyPace.replace(':', '.')) - 1.5} min/km).
            - The plan should include a half marathon race (21.1km) in Week 7 or 8.
            - Format the plan as a clear markdown table, with daily activities and weekly totals. Include important notes on warm-up, cool-down, listening to body, and pace guidelines.
            `;

            console.log("Sending prompt to Gemini:", prompt);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            trainingPlanDiv.textContent = text;
            planOutput.classList.remove('hidden');

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            errorMessageDiv.textContent = `Error generating plan: ${error.message}. Please check your API key and try again. (Check console for details)`;
            errorDiv.classList.remove('hidden');
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });
});
