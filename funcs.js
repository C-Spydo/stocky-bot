
const baseUrl = "https://stockyai-ykup3.ondigitalocean.app";
let currentChatId = null;
let currentStock = null;

$(document).ready(function() {
    // Check if user info exists, else show modal
    if (!localStorage.getItem("email") || !localStorage.getItem("username")) {
        $("#userModal").removeClass("hidden");
    } else {
        $("#usernameDisplay").text(localStorage.getItem("username"));
    }

    // Save user info
    $("#saveUser").click(async function() {
        let username = $("#username").val();
        let email = $("#email").val();
        localStorage.setItem("username", username);
        localStorage.setItem("email", email);
        $("#usernameDisplay").text(username);

        const response = await fetch(`${baseUrl}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: username, email, google_id: generateRandomString() })
        });

        $("#userModal").addClass("hidden");
    });

    // Show chat modal
    $("#newChat").click(function() {
        $("#chatModal").removeClass("hidden");
    });

    // Start chat and save to localStorage
    $("#startChat").click(async function() {
        const stock = $("#stockSelect").val();
        const stock_data = { name: stock, first_prompt: true };

        let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || {};
        chatHistory[stock] = stock_data;
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));                

        $("#chatModal").addClass("hidden");
        updateChatHistory();
        updateMessageInputState();
    });

    // Send message
    $("#sendMessage").click(async function() {
        const message = $("#messageInput").val();
        $("#chatWindow").append(`<div class='p-2 bg-gray-200 rounded my-2'>You: ${message}</div>`);
        $("#messageInput").val("");

        const email = localStorage.getItem("email");
        let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || {};
        let currentChat = chatHistory[currentStock];

        let loadingDiv = $("<div class='p-2 bg-gray-300 rounded my-2 processing'>StockyBot is typing</div>");
        $("#chatWindow").append(loadingDiv);
        
        
        let responseText;
        if (currentChat.first_prompt) {
            const response = await fetch(`${baseUrl}/start-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, prompt: message })
            });

            const data = await response.json();
            currentChatId = data.data.chat_id;
            chatHistory[currentStock] = { name: currentChat.name, first_prompt: false, chat_id: currentChatId };
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));       
            responseText = data.data.ai_response.response;
        } else {
            const response = await fetch(`${baseUrl}/prompt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: currentChat.chat_id, prompt: message })
            });

            const data = await response.json();
            responseText = data.data.ai_response;
        }
        loadingDiv.remove();
        $("#chatWindow").append(`<div class='p-2 bg-green-200 rounded my-2'>StockyBot: ${responseText}</div>`);
    });

    // Update chat history
    function updateChatHistory() {
        let history = JSON.parse(localStorage.getItem("chatHistory")) || {};
        $("#chatHistory").html("");
        Object.keys(history).forEach(stock => {
            let chatItem = $(`<div class='p-2 bg-gray-300 rounded cursor-pointer'>${history[stock].name}</div>`);
            chatItem.click(() => {
                currentStock = stock;
                updateMessageInputState();
                console.log("Selected stock:", currentStock);
            });
            $("#chatHistory").append(chatItem);
        });
    }

    updateChatHistory();

    // Voice to text
    $("#voiceInput").click(function() {
        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.start();
        $("#voiceInput").text("Listening...");
        
        recognition.onresult = function(event) {
            $("#messageInput").val(event.results[0][0].transcript);
        };

        recognition.onspeechend = function() {
            recognition.stop();
            $("#voiceInput").text("🎤");
        };
    });

    function generateRandomString() {
        return Math.random().toString(36).substring(2, 16);
    }

    function updateMessageInputState() {
        if (currentStock === null) {
            $("#messageInput").attr("readonly", true).attr("placeholder", "Please select a chat or start a new chat");
        } else {
            $("#messageInput").removeAttr("readonly").attr("placeholder", "Type a message...");
        }
    }
});
