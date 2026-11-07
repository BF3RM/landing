var youTube = (function () {
    'use strict';

    var youTube = {
        init: function () {
            const players = document.querySelectorAll(".bt-video-container a.youtube");
            players.forEach(function (player, index) {
                const youtubeId = player.dataset.videoid;
                const width = player.dataset.width;
                const height = player.dataset.height;


                // empty any placeholders
                player.innerHTML = '';
                
                const btVideoContainerDiv = document.createElement('div');
                btVideoContainerDiv.classList.add('bt-video-container-div');
                player.prepend(btVideoContainerDiv);
                // Use poster image from YT as background
                player.style.background ="#000 url(https://img.youtube.com/vi/" + youtubeId + "/0.jpg) center center no-repeat";


                const embedUrl = '//www.youtube-nocookie.com/embed/' + youtubeId + '?autoplay=1&rel=0'; // create an embed url.
                // no protocol
                // youtube-nocookie: prevent additional user tracking
                // autoplay: because user already clicked
                // rel=0: no "Related Videos" at end

                // set up the embed iframe
                const videoFrame = '<iframe class="video" src="' + embedUrl + '" frameborder="0" allowfullscreen></iframe>';

                player.addEventListener('click', function (e) {
                    e.preventDefault();
                    player.outerHTML = videoFrame;
                    return false;
                });
            });
        }
    }

    return youTube;

})();

// init at an opportune time
youTube.init();
