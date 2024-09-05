let currentUrl = window.location.href;
let isPageBlocked = false;

// Utility function to get video ID from URL
const getVideoIdFromUrl = () => {
    const url = window.location.href;
    
    // Check if the URL is a regular YouTube video
    if (url.includes('youtube.com/watch')) {
        return new URLSearchParams(window.location.search).get('v'); // Extract video ID from URL parameters
    }
    
    // Check if the URL is a YouTube Shorts video
    if (url.includes('youtube.com/shorts')) {
        const pathParts = url.split('/');
        return pathParts[pathParts.length - 1]; // Extract video ID from the last part of the path
    }
    
    return null; // Return null if it's neither a regular video nor a Shorts video
};

// Fetch video tags from YouTube API
const fetchVideoTags = (videoId) => {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    return fetch(apiUrl)
    .then(response => response.json())
    .then(data => data.items?.[0]?.snippet.tags?.map(tag => tag.toLowerCase()) || [])
    .catch(error => {
        console.error('Error fetching video tags:', error);
        return [];
    });
};

// Block the page with a blue container and "Blocked" message
// Block the video player with a blue container and "Blocked" message
const blockPage = () => {
    const videoPlayer = document.querySelector('.html5-video-player'); // Find the video player element
    if (!videoPlayer) {
        console.warn('Video player not found.');
        return;
    }
    
    // Pause the video element inside the video player
    const videoElement = document.querySelector('video'); // Find the actual <video> element
    if (videoElement) {
        setTimeout(() => {
            videoElement.pause(); // Pause the video after 1 second
            videoElement.addEventListener('play', () => {
                if (isPageBlocked) {
                    videoElement.pause();
                }
            });
            console.log('Video paused after 1 second delay.');
        }, 1000); // 1000 milliseconds = 1 second
    } else {
        console.warn('Video element not found inside the player.');
    }
    
    if (isPageBlocked) {
        return;
    }
    
    // Create a blocking overlay
    const overlay = document.createElement('div');
    overlay.id = 'video-block-overlay';
    overlay.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.8); /* Semi-transparent black */
        color: white;
        font-size: 48px;
        font-weight: bold;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1000; /* Ensure the overlay is on top of the video player */
    `;
    overlay.textContent = 'Blocked';
    
    // Append the overlay to the video player without blurring the overlay text
    videoPlayer.appendChild(overlay);
    console.log('Video player blocked.');
    isPageBlocked = true;
};

// Function to remove the overlay and play the video again
const reloadPageIfBlocked = () => {
    if (isPageBlocked) {
        console.log('Page was blocked, now removing block and resuming video playback.');
        
        // Find and remove the overlay
        const overlay = document.getElementById('video-block-overlay');
        if (overlay) {
            overlay.remove(); // Remove the overlay
            console.log('Overlay removed.');
        }
        
        // Resume video playback
        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoElement.play().then(() => {
                console.log('Video resumed.');
            }).catch(error => {
                console.error('Error resuming video:', error);
            });
        } else {
            console.warn('Video element not found inside the player.');
        }
        
        isPageBlocked = false; // Reset the block flag
    }
};

// Main function to check video tags and either block or reload the page
const checkAndReplacePage = async () => {
    try {
        const { tags: userTags = [], enabled: isEnabled = false } = await browser.storage.local.get(['tags', 'enabled']);
        console.log('User tags:', userTags);
        
        const videoId = getVideoIdFromUrl();
        if (!videoId || !isEnabled) return reloadPageIfBlocked();
        
        const videoTags = await fetchVideoTags(videoId);
        console.log('Video tags:', videoTags);
        
        const matchedTag = userTags.some(userTag =>
                                         videoTags.some(videoTag => videoTag.toLowerCase().includes(userTag.toLowerCase()))
                                         );
        matchedTag ? blockPage() : reloadPageIfBlocked();
        
    } catch (error) {
        console.error('Error checking and replacing page:', error);
    }
};

// Check if the previous URL was a regular YouTube video and the current URL is a Shorts video
const shouldReloadForShorts = () => {
    const previousIsNotShortVideo = !currentUrl.includes('youtube.com/shorts');
    const currentIsShortsVideo = window.location.href.includes('youtube.com/shorts');
    return previousIsNotShortVideo && currentIsShortsVideo;
};

// Check if the URL has changed
const checkForUrlChange = () => {
    if (currentUrl !== window.location.href) {
        console.log('URL changed:', window.location.href);
        
        // Check if previous URL was a regular YouTube video and current URL is a Shorts video
        if (shouldReloadForShorts()) {
            console.log('Previous URL was a regular video, current URL is Shorts. Reloading...');
            window.location.reload();
        }
        
        currentUrl = window.location.href;
        checkAndReplacePage();
    }
};

// Run the check on page load and periodically check for URL changes
checkAndReplacePage();
setInterval(checkForUrlChange, 1000); // Check every 1 second
