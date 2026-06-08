import os
import sys
import json
import urllib.request
import http.cookiejar
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ytmusicapi import YTMusic
import yt_dlp
import curl_cffi

app = FastAPI(title="YTMusic Local API", description="Exhaustive API wrapper for ytmusicapi")

# Configure CORS securely for dynamic dev ports and Tauri production origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|tauri\.localhost)(:[0-9]+)?$|^tauri://localhost$|^https://music\.youtube\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define app data directory in the user's home folder
APP_DIR = os.path.join(os.path.expanduser("~"), ".serene_app")
os.makedirs(APP_DIR, exist_ok=True)

OAUTH_FILE = os.path.join(APP_DIR, "oauth.json")
BROWSER_FILE = os.path.join(APP_DIR, "browser.json")
COOKIES_FILE = os.path.join(APP_DIR, "cookies.txt")

# Initialize YTMusic
def get_ytmusic():
    from curl_cffi import requests
    session = requests.Session(impersonate="chrome110")
    
    if os.path.exists(OAUTH_FILE):
        try:
            return YTMusic(OAUTH_FILE, requests_session=session)
        except Exception as e:
            print(f"Error initializing YTMusic with oauth.json: {e}")
    if os.path.exists(BROWSER_FILE):
        try:
            return YTMusic(BROWSER_FILE, requests_session=session)
        except Exception as e:
            print(f"Error initializing YTMusic with browser.json: {e}")
    return YTMusic(requests_session=session)

yt = get_ytmusic()

# ==========================================
# 0. Proxy Endpoints
# ==========================================

@app.get("/proxy/image")
def proxy_image(url: str = Query(..., description="The original image URL to proxy")):
    """Proxies an image request via curl_cffi to bypass CDN restrictions and CORS."""
    try:
        from curl_cffi import requests
        # Fetch the image perfectly mimicking Chrome to bypass CDN blocks
        res = requests.get(url, impersonate="chrome110")
        if res.status_code == 200:
            content_type = res.headers.get("Content-Type", "image/jpeg")
            return Response(content=res.content, media_type=content_type)
        else:
            raise HTTPException(status_code=res.status_code, detail="Image fetch failed upstream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 1. Browsing & Music Data
# ==========================================

@app.get("/home")
def get_home(limit: int = 3, country: str = 'ZZ'):
    """Get home recommendations. Mixes, charts, and personalized content if auth'd."""
    try:
        # If user is authenticated, we use the global authenticated yt instance.
        # If not, we create a temporary localized instance to get region-specific home!
        if os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE):
            return yt.get_home(limit=limit)
        else:
            loc = country if country != 'ZZ' else None
            from curl_cffi import requests
            session = requests.Session(impersonate="chrome110")
            local_yt = YTMusic(location=loc, requests_session=session)
            return local_yt.get_home(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/artist/{channelId}")
def get_artist(channelId: str):
    """Get artist details, top songs, albums, and singles."""
    try:
        return yt.get_artist(channelId)
    except Exception as e:
        try:
            # Fallback for regular YouTube channels (non-musicians or podcasts)
            channel_data = yt.get_channel(channelId)
            
            # Fetch authentic avatar, bio, and sub count from generic YouTube InnerTube
            url = "https://www.youtube.com/youtubei/v1/browse"
            data = {"context": {"client": {"clientName": "WEB", "clientVersion": "2.20210210.08.00"}}, "browseId": channelId}
            req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
            res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
            
            model = res.get("header", {}).get("pageHeaderRenderer", {}).get("content", {}).get("pageHeaderViewModel", {})
            thumbnails = model.get("image", {}).get("decoratedAvatarViewModel", {}).get("avatar", {}).get("avatarViewModel", {}).get("image", {}).get("sources", [])
            
            description = model.get("description", {}).get("descriptionPreviewViewModel", {}).get("description", {}).get("content", "")
            if not description:
                description = "This is a regular YouTube channel or Podcast. Complete artist features may not be available."
                
            sub_count = ""
            for row in model.get("metadata", {}).get("contentMetadataViewModel", {}).get("metadataRows", []):
                for part in row.get("metadataParts", []):
                    if "subscribers" in part.get("text", {}).get("content", ""):
                        sub_count = part["text"]["content"]
            
            # Combine episodes and videos
            videos = channel_data.get("videos", {}).get("results", [])
            episodes = channel_data.get("episodes", {}).get("results", []) if "episodes" in channel_data else []
            combined_songs = episodes + videos
            
            # Combine podcasts and playlists
            playlists = channel_data.get("playlists", {}).get("results", [])
            podcasts = channel_data.get("podcasts", {}).get("results", []) if "podcasts" in channel_data else []
            combined_albums = podcasts + playlists

            return {
                "name": channel_data.get("title", "Unknown Channel"),
                "description": description,
                "views": "",
                "subscribers": sub_count,
                "thumbnails": thumbnails, 
                "isPodcastChannel": "episodes" in channel_data or "podcasts" in channel_data,
                "songs": {"browseId": None, "results": combined_songs},
                "albums": {"browseId": None, "results": combined_albums},
                "singles": {"browseId": None, "results": []},
                "related": {"browseId": None, "results": []}
            }
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=str(fallback_err))

@app.get("/artist/{channelId}/albums")
def get_artist_albums(channelId: str, params: Optional[str] = None):
    """Get all artist albums."""
    try:
        return yt.get_artist_albums(channelId, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/album/{albumId}")
def get_album(albumId: str):
    """Get album, playlist, or podcast details and tracks."""
    try:
        if albumId.startswith("MPSP"):
            data = yt.get_podcast(albumId)
            if "episodes" in data:
                data["tracks"] = data.pop("episodes")
            if "author" in data:
                data["artists"] = [data["author"]]
            return data
        elif albumId.startswith("VL") or albumId.startswith("PL"):
            data = yt.get_playlist(albumId)
            if "author" in data:
                data["artists"] = [data["author"]]
            return data
        else:
            return yt.get_album(albumId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/song/{videoId}")
def get_song(videoId: str):
    """Get song metadata."""
    try:
        return yt.get_song(videoId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/watch/{videoId}")
def get_watch_playlist(videoId: str, playlistId: Optional[str] = None, limit: int = 50):
    """Get the watch playlist (radio/queue) for a video."""
    try:
        return yt.get_watch_playlist(videoId=videoId, playlistId=playlistId, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/song/{browseId}/related")
def get_song_related(browseId: str):
    """Get related songs for radio/recommendations."""
    try:
        return yt.get_song_related(browseId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lyrics/{browseId}")
def get_lyrics(browseId: str):
    """Get song lyrics."""
    try:
        return yt.get_lyrics(browseId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/song/{videoId}/credits")
def get_song_credits(videoId: str):
    try:
        credits_data = yt.get_song_related(videoId)
        return credits_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream/{videoId}")
def get_stream_url(videoId: str):
    # First attempt: Fast path without cookies
    ydl_opts_anon = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    url = f"https://www.youtube.com/watch?v={videoId}"

    try:
        with yt_dlp.YoutubeDL(ydl_opts_anon) as ydl:
            info = ydl.extract_info(url, download=False)
            return {"url": info['url']}
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e).lower()
        # If bot detection hits, or format is unavailable (which often implies a signature or PO token challenge), fallback
        if "sign in to confirm" in error_msg or "bot" in error_msg or "requested format is not available" in error_msg:
            cookie_file = os.path.join(os.path.expanduser("~"), ".serene_app", "cookies.txt")
            
            ydl_opts_auth = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'js_runtimes': {'node': {}}
            }
            if os.path.exists(cookie_file):
                ydl_opts_auth['cookiefile'] = cookie_file

            try:
                with yt_dlp.YoutubeDL(ydl_opts_auth) as ydl:
                    info = ydl.extract_info(url, download=False)
                    return {"url": info['url']}
            except Exception as auth_e:
                raise HTTPException(status_code=500, detail=str(auth_e))
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 2. Playlists & Watch Queue
# ==========================================

@app.get("/watch")
def get_watch_playlist(
    videoId: Optional[str] = None, 
    playlistId: Optional[str] = None, 
    radio: bool = True, 
    shuffle: bool = False,
    limit: int = 25
):
    """Get the 'Up Next' queue/radio based on a videoId or playlistId. Critical for playback!"""
    try:
        return yt.get_watch_playlist(videoId=videoId, playlistId=playlistId, limit=limit, radio=radio, shuffle=shuffle)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/playlist/{playlistId}")
def get_playlist(playlistId: str, limit: int = 100):
    """Get playlist details and tracks."""
    try:
        return yt.get_playlist(playlistId, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 3. Search & Explore
# ==========================================

@app.get("/search")
def search(query: str, filter: Optional[str] = None, limit: int = 20):
    """Search for songs, videos, albums, artists, playlists. Filter can be 'songs', 'videos', 'albums', 'artists', 'playlists'."""
    try:
        return yt.search(query, filter=filter, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search/suggestions")
def get_search_suggestions(query: str, detailed_runs: bool = False):
    """Auto-complete suggestions for the search bar."""
    try:
        return yt.get_search_suggestions(query, detailed_runs=detailed_runs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/charts")
def get_charts(country: str = 'ZZ'):
    """Global and country-specific top charts."""
    try:
        return yt.get_charts(country=country)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explore/moods")
def get_mood_categories():
    """Get mood categories for exploring curated moods/genres."""
    try:
        return yt.get_mood_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explore/moods/{params}")
def get_mood_playlists(params: str):
    """Get mood playlists."""
    try:
        return yt.get_mood_playlists(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 4. Library & User (Requires Auth)
# ==========================================

@app.get("/auth/status")
def auth_status():
    """Check if authenticated"""
    return {"authenticated": os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)}

class DeviceCodeRequest(BaseModel):
    client_id: str
    client_secret: str

@app.post("/auth/device-code")
def get_device_code(req: DeviceCodeRequest):
    """Initiates OAuth device flow and returns user code and verification URL"""
    try:
        from ytmusicapi.auth.oauth.credentials import OAuthCredentials
        cred = OAuthCredentials(req.client_id, req.client_secret)
        code = cred.get_code()
        return code
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TokenRequest(BaseModel):
    client_id: str
    client_secret: str
    device_code: str

@app.post("/auth/token")
def poll_for_token(req: TokenRequest):
    """Polls for the token and saves it to oauth.json"""
    try:
        from ytmusicapi.auth.oauth.credentials import OAuthCredentials
        cred = OAuthCredentials(req.client_id, req.client_secret)
        token = cred.token_from_code(req.device_code)
        
        # Save token to file
        with open(OAUTH_FILE, "w") as f:
            json.dump(token, f)
            
        # Re-initialize yt
        global yt
        yt = get_ytmusic()
        return {"success": True}
    except Exception as e:
        # e.g., authorization_pending
        raise HTTPException(status_code=400, detail=str(e))

class CookieRequest(BaseModel):
    cookie: str

@app.post("/auth/cookie")
def auth_cookie(req: CookieRequest):
    """Saves browser cookie for auth"""
    try:
        from ytmusicapi.helpers import sapisid_from_cookie, get_authorization
        
        try:
            sapisid = sapisid_from_cookie(req.cookie)
        except Exception:
            sapisid = ""

        origin = "https://music.youtube.com"
        auth_header = get_authorization(sapisid + " " + origin) if sapisid else ""

        browser_json = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "cookie": req.cookie,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "x-goog-authuser": "0",
            "origin": origin
        }
        
        if auth_header:
            browser_json["authorization"] = auth_header

        with open(BROWSER_FILE, "w", encoding="utf-8") as f:
            json.dump(browser_json, f, indent=4)
            
        # Explicitly write cookies.txt in Netscape format for yt-dlp
        with open(COOKIES_FILE, "w", encoding="utf-8") as f:
            f.write("# Netscape HTTP Cookie File\n")
            f.write("# http://curl.haxx.se/rfc/cookie_spec.html\n")
            f.write("# This is a generated file!  Do not edit.\n\n")
            
            for part in req.cookie.split(";"):
                part = part.strip()
                if "=" in part:
                    name, value = part.split("=", 1)
                    # format: domain, include_subdomains, path, secure, expiration, name, value
                    f.write(f".youtube.com\tTRUE\t/\tTRUE\t2145916800\t{name}\t{value}\n")
            
        global yt
        yt = get_ytmusic()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/logout")
def auth_logout():
    """Logs out user by deleting auth files"""
    if os.path.exists(OAUTH_FILE):
        os.remove(OAUTH_FILE)
    if os.path.exists(BROWSER_FILE):
        os.remove(BROWSER_FILE)
    global yt
    yt = get_ytmusic()
    return {"success": True}

@app.get("/account")
def get_account_info():
    """Get the logged-in user's profile info."""
    try:
        return yt.get_account_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history():
    """Gets play history."""
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return yt.get_history()
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class HistoryItem(BaseModel):
    song: str

@app.post("/history/add")
def add_history_item(item: HistoryItem):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
            
        # ytmusicapi requires the full song dict (which contains trackingUrl) to add to history
        song_dict = yt.get_song(item.song)
        return yt.add_history_item(song_dict)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/library/liked")
def get_liked_songs(limit: int = 100):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return yt.get_liked_songs(limit)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/library/playlists")
def get_library_playlists(limit: int = 25):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return yt.get_library_playlists(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CreatePlaylistRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    privacy_status: str = "PRIVATE"
    video_ids: List[str] = []

@app.post("/library/playlists/create")
def create_playlist(req: CreatePlaylistRequest):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        playlist_id = yt.create_playlist(req.title, req.description or "", req.privacy_status, req.video_ids)
        return {"success": True, "playlistId": playlist_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/library/playlists/{playlistId}")
def delete_playlist(playlistId: str):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        status = yt.delete_playlist(playlistId)
        return {"success": True, "status": status}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AddToPlaylistRequest(BaseModel):
    playlistId: str
    videoIds: List[str]

@app.post("/library/playlists/add")
def add_to_playlist(req: AddToPlaylistRequest):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        status = yt.add_playlist_items(req.playlistId, req.videoIds)
        return {"success": True, "status": status}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rate song
class RateRequest(BaseModel):
    videoId: str
    rating: str  # LIKE, DISLIKE, INDIFFERENT

@app.post("/rate")
def rate_song(req: RateRequest):
    try:
        if not (os.path.exists(OAUTH_FILE) or os.path.exists(BROWSER_FILE)):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return yt.rate_song(req.videoId, req.rating)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/youtube/search")
def search_youtube(query: str):
    """Direct InnerTube Generic YouTube Search for normal videos."""
    url = "https://www.youtube.com/youtubei/v1/search"
    data = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20210210.08.00"
            }
        },
        "query": query
    }
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
        res = urllib.request.urlopen(req).read().decode("utf-8")
        parsed = json.loads(res)
        
        contents = parsed.get("contents", {}).get("twoColumnSearchResultsRenderer", {}).get("primaryContents", {}).get("sectionListRenderer", {}).get("contents", [])
        
        videos = []
        for section in contents:
            items = section.get("itemSectionRenderer", {}).get("contents", [])
            for item in items:
                if "videoRenderer" in item:
                    v = item["videoRenderer"]
                    
                    video_id = v.get("videoId")
                    title = v.get("title", {}).get("runs", [{}])[0].get("text", "")
                    
                    owner = v.get("ownerText", {}).get("runs", [{}])[0] if v.get("ownerText") else {}
                    author_name = owner.get("text", "Unknown")
                    author_id = owner.get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId")
                    
                    thumbnails = v.get("thumbnail", {}).get("thumbnails", [])
                    poster = thumbnails[-1]["url"] if thumbnails else ""
                    
                    videos.append({
                        "id": video_id,
                        "title": title,
                        "artist": author_name,
                        "artistId": author_id,
                        "album": "YouTube",
                        "poster": poster,
                        "source": "youtube"
                    })
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import multiprocessing
    import socket
    multiprocessing.freeze_support()
    import uvicorn
    
    # Find a free port dynamically
    def get_free_port():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]
            
    port = get_free_port()
    # Print the marker so the Tauri sidecar listener can extract it
    print(f"SERENE_PORT={port}", flush=True)
    
    # Add filter to suppress noisy "Unsupported upgrade request" warnings from Vite HMR
    import logging
    class FilterUpgradeRequests(logging.Filter):
        def filter(self, record):
            return "Unsupported upgrade request" not in record.getMessage()
            
    logging.getLogger("uvicorn.error").addFilter(FilterUpgradeRequests())
    
    # Run the server locally on the dynamically assigned port
    uvicorn.run(app, host="127.0.0.1", port=port)

