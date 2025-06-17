// **CRITICAL SECURITY WARNING:**
// DO NOT DEPLOY THIS CODE TO A PUBLIC WEBSITE WITH THE API KEY EXPOSED.
// THIS IS FOR LOCAL, EXPERIMENTAL TESTING ONLY.
// FOR SECURE DEPLOYMENT, YOU MUST USE A BACKEND SERVER TO CALL THE GEMINI API.

// Import the GoogleGenerativeAI library from a CDN
// This requires your <script> tag in index.html to be type="module"
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// === REPLACE THIS WITH YOUR ACTUAL GEMINI API KEY ===
// This is the insecure part. For production, manage this key on a backend.
const API_KEY = "AIzaSyBUHFr6rqFvPN6oqN25a_vfIXuORlDqnME";
// ====================================================

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
        trainingPlanDiv.innerHTML = ''; // Clear previous plan and use innerHTML

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash for speed

            // Construct the prompt using the gathered parameters and context
            const prompt = `
            You are an Jack Daniels, expert running coach. Create a running plan that ends with Goal race submitted by user.
            Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            
            User's Details:
            - Running Goal: ${parameters.goal}
            - Current Weekly Mileage: ${parameters.currentMileage} km
            - Running Days: ${parameters.runningDays}
            - Peak Weekly Mileage during plan: ${parameters.peakMileage || 'not specified'} km (if not specified, aim for a sensible progression to achieve the goal)
            - Desired Workout Types: ${parameters.workoutTypes || 'interval training, easy runs, long runs, tempo runs'}
            - User's Reported Easy Pace: ${parameters.easyPace} min/km
            - User's Target Race Pace: ${parameters.targetPace} min/km

            **Important Pace Guidelines to Incorporate:**
            - Easy/Long Run Pace should slightly slower than the reported easy pace. Suggest a range of **${(parseFloat(parameters.easyPace.replace(':', '.')) + 0.5).toFixed(2).replace('.',':')} to ${(parseFloat(parameters.easyPace.replace(':', '.')) + 1.0).toFixed(2).replace('.',':')} min/km** (e.g., if user easy is 7:45, suggest 8:00-8:15). 
            - Tempo Pace should be comfortably hard, faster than easy but slower than interval. Suggest a range of **${(parseFloat(parameters.easyPace.replace(':', '.')) - 0.5).toFixed(2).replace('.',':')} to ${(parseFloat(parameters.easyPace.replace(':', '.')) - 0.25).toFixed(2).replace('.',':')} min/km**.
            - Interval Pace should be significantly faster and challenging, requiring strong effort. Suggest a range of **${(parseFloat(parameters.easyPace.replace(':', '.')) - 1.0).toFixed(2).replace('.',':')} to ${(parseFloat(parameters.easyPace.replace(':', '.')) - 1.5).toFixed(2).replace('.',':')} min/km**.

            **Output Format:**
            Provide the plan using markdown. Start with a main heading for the plan. Follow with key parameters, pace guidelines, and general important notes (warm-up, cool-down, rest, hydration, listening to body). The main training schedule MUST be a clear markdown table with columns for **Week, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Total Weekly Mileage (km), and Notes.** Use 'Rest' for rest days. Ensure the table is correctly formatted with headers and separators.
            Conclude with a motivational closing statement.
            `;

            console.log("Sending prompt to Gemini...");

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const rawGeminiOutput = response.text(); // This is the markdown text from Gemini

            console.log("Raw Gemini Output:", rawGeminiOutput); // Log raw output for debugging

            // Format the markdown output into HTML
            const formattedPlanHtml = formatGeminiOutputToHtml(rawGeminiOutput);

            trainingPlanDiv.innerHTML = formattedPlanHtml; // Render HTML content
            planOutput.classList.remove('hidden');

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            let errorMessage = `Error generating plan: ${error.message}.`;
            if (error.message.includes('API key')) {
                errorMessage += " Please check your API key and ensure it's correct and valid.";
            } else if (error.message.includes('blocked by CORS')) {
                 errorMessage += " This is likely a CORS issue. For production, you MUST use a backend server to call the API securely.";
            } else if (error.message.includes('Quota exceeded')) {
                 errorMessage += " You might have exceeded your API quota. Please check your Google Cloud Console.";
            }
            errorMessageDiv.textContent = errorMessage;
            errorDiv.classList.remove('hidden');
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    /**
     * Helper function to convert a markdown table string into an HTML <table>.
     * Assumes a standard markdown table format.
     */
    function markdownTableToHtml(markdownTable) {
        const lines = markdownTable.split('\n').filter(line => line.trim().startsWith('|'));
        if (lines.length < 2) return ''; // Not enough lines for a table, return empty string or original markdown

        const headerLine = lines[0];
        const headerCells = headerLine.split('|').map(h => h.trim()).filter(h => h);

        let html = '<table class="training-plan-table">\n<thead><tr>'; // Add a class for styling
        headerCells.forEach(cell => {
            html += `<th>${cell}</th>`;
        });
        html += '</tr></thead>\n<tbody>';

        // Start from index 2, skipping header and separator line
        for (let i = 2; i < lines.length; i++) {
            const rowCells = lines[i].split('|').map(c => c.trim()).filter(c => c);
            html += '<tr>';
            rowCells.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>\n';
        }
        html += '</tbody></table>\n';
        return html;
    }


    /**
     * Converts markdown output from Gemini into formatted HTML.
     * This function is designed to handle the typical markdown output from Gemini,
     * including headings, bold text, lists, and a central table.
     */
    function formatGeminiOutputToHtml(markdownText) {
        let htmlContent = markdownText;

        // 1. Extract and convert the table first
        const tableRegex = /(\|.*?\|\n\|---.*?---\|\n(?:\|.*?\|\n)+)/s; // Regex to capture a full markdown table block
        const tableMatch = htmlContent.match(tableRegex);
        let htmlTable = '';
        if (tableMatch) {
            const markdownTable = tableMatch[0];
            htmlTable = markdownTableToHtml(markdownTable);
            // Replace the markdown table with a unique placeholder. Using a placeholder for robustness.
            htmlContent = htmlContent.replace(markdownTable, '');
        }

        // 2. Convert other common markdown elements to HTML
        htmlContent = htmlContent
            .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headings
            .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headings
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic text

        // 3. Convert list items. This handles blocks of list items.
        const listBlockRegex = /(\n\* [^\n]+(?:(?:\n\* [^\n]+)*))/g;
        htmlContent = htmlContent.replace(listBlockRegex, (match) => {
            const listItems = match.split('\n').filter(line => line.trim().startsWith('*')).map(line => `<li>${line.substring(2).trim()}</li>`).join('\n');
            return `<ul>\n${listItems}\n</ul>\n`;
        });

        // 4. Convert remaining significant lines into paragraphs
        // This regex attempts to find lines that are not already HTML tags or just whitespace
        htmlContent = htmlContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                // Keep lines that are not empty AND not part of a processed tag (headings, lists, table placeholder)
                return line.length > 0 &&
                       !line.startsWith('<h') &&
                       !line.startsWith('<ul') &&
                       !line.startsWith(''); // Check for the table placeholder
            })
            .map(line => `<p>${line}</p>`)
            .join('\n');


        // 5. Insert the HTML table back into its placeholder
        if (tableMatch) {
            htmlContent = htmlContent.replace('', htmlTable);
        }
        
        // Final cleanup for potential extra newlines or empty paragraphs that might result from splitting/joining
        htmlContent = htmlContent.replace(/<\/p>\n<p>/g, '\n'); // Remove extra p tags around content
        htmlContent = htmlContent.replace(/<p>\s*<\/p>/g, ''); // Remove truly empty paragraphs

        return htmlContent;
    }
});
