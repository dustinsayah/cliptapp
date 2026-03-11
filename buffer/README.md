# Buffer TikTok Poster

## 1. Install
```
cd buffer
npm install
```

## 2. Add API key
Open `.env` and replace `paste_your_token_here` with your Buffer access token.

## 3. Run
Drop images into `slideshows/slideshow-7/slides/`, fill in `slideshows/slideshow-7/caption.txt`, then:
```
node post.js --slideshow 7
```
