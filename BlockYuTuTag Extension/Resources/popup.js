// Utility function to get settings from browser storage
const getSettings = async () => {
    try {
        return await browser.storage.local.get(['tags', 'enabled']);
    } catch (error) {
        console.error('Error retrieving settings:', error);
        return { tags: [], enabled: false };
    }
};

// Utility function to save settings to browser storage
const saveSettings = async (tags, enabled) => {
    try {
        await browser.storage.local.set({ tags, enabled });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

// Utility function to create and display tags as chips
const displayTagsAsChips = (tags, outputElement) => {
    outputElement.innerHTML = ''; // Clear previous chips
    tags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = tag;
        outputElement.appendChild(chip);
    });
};

// Function to fetch video tags from YouTube API
const fetchVideoTags = async (videoId) => {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            return data.items[0].snippet.tags || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching video tags:', error);
        return [];
    }
};

// Utility function to extract video ID from URL (handles both regular and Shorts)
const getVideoIdFromUrl = (url) => {
    const youtubeWatchRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
    const youtubeShortsRegex = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;

    const watchMatch = url.match(youtubeWatchRegex);
    if (watchMatch) {
        return watchMatch[1]; // Return the video ID from regular YouTube video URL
    }

    const shortsMatch = url.match(youtubeShortsRegex);
    if (shortsMatch) {
        return shortsMatch[1]; // Return the video ID from YouTube Shorts URL
    }

    return null; // Return null if no valid video ID is found
};

// Event handler to load saved settings and initialize the popup
const loadPopup = async () => {
    const { tags, enabled } = await getSettings();
    const tagsInput = document.getElementById('tags');
    const enableBlockingCheckbox = document.getElementById('enable-blocking');
    
    tagsInput.value = tags.join(', ');
    enableBlockingCheckbox.checked = enabled;
};

// Event handler to save settings when the save button is clicked
const handleSave = async () => {
    const tagsInput = document.getElementById('tags');
    const enableBlockingCheckbox = document.getElementById('enable-blocking');
    const tags = tagsInput.value.split(',').map(tag => tag.trim());
    const enabled = enableBlockingCheckbox.checked;

    await saveSettings(tags, enabled);
    window.close();
};

// Event handler to fetch and display video tags
const handleFetchVideoTags = async () => {
    const videoTagsOutput = document.getElementById('video-tags-output');
    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

        // Get the video ID from the URL, whether it's a regular video or a Shorts video
        const videoId = getVideoIdFromUrl(tab.url);
        if (videoId) {
            const videoTags = await fetchVideoTags(videoId);
            if (videoTags.length > 0) {
                displayTagsAsChips(videoTags, videoTagsOutput);
            } else {
                videoTagsOutput.textContent = 'No tags found for this video.';
            }
        } else {
            videoTagsOutput.textContent = 'Invalid YouTube video URL.';
        }
    } catch (error) {
        console.error('Error getting the current tab:', error);
        videoTagsOutput.textContent = 'Error getting the current tab.';
    }
};

// Attach event listeners after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save');
    const fetchVideoTagsButton = document.getElementById('fetch-video-tags');

    loadPopup(); // Load the popup with saved settings

    saveButton.addEventListener('click', handleSave);
    fetchVideoTagsButton.addEventListener('click', handleFetchVideoTags);
});
