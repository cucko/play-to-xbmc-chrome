/**
 *  Handy curl command:
 *  curl -i -X POST --header Content-Type:"application/json" -d '' http://localhost:8085/jsonrpc
 */

var debugLogsEnabled = false;
chrome.extension.sendMessage({action: 'isDebugLogsEnabled'}, function (response) {
    if (response) {
        debugLogsEnabled = response.response;
    }
});

function getSiteName(url) {
    if (url.match("magnet:")) {
        return "magnet"
    }
    var typeRegex = '(https|http)://(www\.)?([^\.]+)\.([^/]+).+';
    return url.match(typeRegex)[3];
}

function getPluginPath(url, callback) {
    var videoId;

    var name = getSiteName(url);
    var type;

    var youtubeRegex = 'v=([^&]+)';
    var mycloudplayersPlayRegex = 'play=([^&]+)';
    var vimeoRegex = '^(https|http)://(www\.)?vimeo.com.*/(\\d+).*$';
    var freerideRegex = '^(https|http)://(www\.)?freeride.se.*/(\\d+).*$';
    var collegehumorRegex = '(https|http)://(www\.)?collegehumor.com/[video|embed]+/([^_&/#\?]+)';
    var dailymotionRegex = '(https|http)://(www\.)?dailymotion.com/video/([^_&/#\?]+)';
    var ebaumsworldRegex = '(https|http)://(www\.)?ebaumsworld.com/video/watch/([^_&/#\?]+)';
    var twitchtvRegex = '^(https|http)://(www\.)?twitch.tv/([^_&/#\?]+).*$';
    var mixcloudRegex = '(https|http)://(www\.)?mixcloud.com(/[^_&#\?]+/[^_&#\?]+)';
    var huluRegex = '(https|http)://(www\.)?hulu.com/watch/([^_&/#\?]+)';
	var daserstemediathekRegex = '(https|http)://(www\.)?ardmediathek.de/.*?documentId=([^_&/#\?]+)';
	
    switch (name) {
        case 'youtube':
            videoId = url.match(youtubeRegex)[1];
            type = 'video';
            break;

        case 'vimeo':
            videoId = url.match(vimeoRegex)[3];
            type = 'video';
            break;

        case 'freeride':
            videoId = url.match(freerideRegex)[3];
            callback('video', 'http://v.freeride.se/encoded/mp4-hd/' + videoId + '.mp4');
            break;

        case 'collegehumor':
            videoId = url.match(collegehumorRegex)[3];
            type = 'video';
            break;

        case 'dailymotion':
            videoId = url.match(dailymotionRegex)[3];
            type = 'video';
            break;

        case 'ebaumsworld':
            videoId = url.match(ebaumsworldRegex)[3];
            type = 'video';
            break;

        case 'twitch':
            videoId = url.match(twitchtvRegex)[3];
            type = 'video';
            break;

        case 'soundcloud':
            getSoundcloudTrackId(url, function (trackId) {
                callback('audio', buildPluginPath(name, trackId));
            });
            return;

		case 'mycloudplayers':
			var trackId = url.match(mycloudplayersPlayRegex) && url.match(mycloudplayersPlayRegex)[1];
			if (trackId)
				callback('audio', buildPluginPath('soundcloud', trackId));
            return;

        case 'liveleak':
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.sendMessage(tab.id, {action: 'getLiveLeakVideoUrl'}, function (response) {
                    if (response) {
                        var liveLeakUrl = response.url;
                        callback('video', liveLeakUrl);
                    }
                });
            });
            return;

        case 'mixcloud':
            videoId = url.match(mixcloudRegex)[3];
            type = 'audio';
            break;

        case 'khanacademy':
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.sendMessage(tab.id, {action: 'getYoutubeId'}, function (response) {
                    if (response) {
                        var youtubeId = JSON.parse(response.youtubeId);
                        callback('video', buildPluginPath('youtube', youtubeId));
                    }
                });
            });
            break;

        case 'hulu':
            videoId = url.match(huluRegex)[3];
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.sendMessage(tab.id, {action: 'getContentId'}, function (response) {
                    if (response) {
                        var contentId = JSON.parse(response.contentId);
                        chrome.tabs.sendMessage(tab.id, {action: 'getEid'}, function (response2) {
                            if (response2) {
                                var eId = JSON.parse(response2.eid);
                                callback('video', 'plugin://plugin.video.hulu/?mode=\\"TV_play\\"&url=\\"' + encodeURIComponent(contentId) + '\\"&videoid=\\"' + encodeURIComponent(videoId) + '\\"&eid=\\"' + encodeURIComponent(eId) + '\\"');
                            }
                        })
                    }
                });
            });
            break;

        case 'magnet':
            videoId = url;
            type = 'video';
            break;
		
		case 'ardmediathek':
			videoId = url;
			type = 'video';
			break;
			
        default:
            console.log('An error has occurred while attempting to obtain content id.');
    }

    callback(type, buildPluginPath(name, videoId));
}

function buildPluginPath(type, videoId) {
    switch (type) {
        case 'youtube':
        case 'vimeo':
            return 'plugin://plugin.video.' + type + '/?action=play_video&videoid=' + videoId;

        case 'collegehumor':
            return 'plugin://plugin.video.' + type + '/watch/' + encodeURIComponent(videoId) + '/';

        case 'dailymotion':
        case 'ebaumsworld':
            return 'plugin://plugin.video.' + type + '_com/?url=' + videoId + '&mode=playVideo';

        case 'twitch':
            return 'plugin://plugin.video.twitch/playLive/' + videoId + '/';

        case 'soundcloud':
            return 'plugin://plugin.audio.soundcloud/?url=plugin%3A%2F%2Fmusic%2FSoundCloud%2Ftracks%2F' + videoId + '&permalink=' + videoId + '&oauth_token=&mode=15';

        case 'mixcloud':
            return 'plugin://plugin.audio.mixcloud/?mode=40&key=' + encodeURIComponent(videoId);

        case 'magnet':
            return 'plugin://plugin.video.xbmctorrent/play/' + encodeURIComponent(videoId);
	
		case 'ardmediathek':
			return 'plugin://plugin.video.ardmediathek_de/?mode=playVideo&url=' + encodeURIComponent(videoId);
        default:
            return '';
    }
}

function queueItem(url, callback) {
    if (isDirectVideoLink(url)) {
        addItemsToPlaylist([
            {"contentType": 'video', "pluginPath": url}
        ], function (result) {
            callback(result);
        });
    } else if (isDirectAudioLink(url)) {
        addItemsToPlaylist([
            {"contentType": 'audio', "pluginPath": url}
        ], function (result) {
            callback(result);
        });
    } else {
        getPluginPath(url, function (contentType, pluginPath) {
            addItemsToPlaylist([
                {"contentType": contentType, "pluginPath": pluginPath}
            ], function (result) {
                callback(result);
            });
        });
    }
}

function queueItems(tabUrl, urlList, callback) {
    var contentArr = [];
    var name = getSiteName(tabUrl);
    $.each(urlList, function (i, item) {
        var url = item;
        switch (name) {
            case 'youtube':
                getPluginPath(url, function (contentType, pluginPath) {
                    var element = {"contentType": contentType, "pluginPath": pluginPath};
                    contentArr.push(element);
                    // do we have the whole items.
                    if (contentArr.length == urlList.length) {
                        addItemsToPlaylist(contentArr, function (result) {
                            callback(result);
                        });
                    }
                });
                break;

            case 'soundcloud':
                var element = {"contentType": 'audio', "pluginPath": buildPluginPath('soundcloud', url)};
                contentArr.push(element);
                if (contentArr.length == urlList.length) {
                    addItemsToPlaylist(contentArr, function (result) {
                        callback(result);
                    });
                }
                break;
        }
    });
}

function insertItem(url, position, callback) {
    getPluginPath(url, function (contentType, pluginPath) {
        insertItemToPlaylist(contentType, pluginPath, position, function (result) {
            callback(result);
        });
    });
}

function ajaxPost(data, callback, timeout) {
    var url = getURL();
    var fullPath = url + "/jsonrpc";
    var defaultTimeout = 5000;
    if (timeout) {
        defaultTimeout = timeout;
    }
    if (debugLogsEnabled) {
        console.log("POST " + data);
    }

    jQuery.ajax({
        type: 'POST',
        url: fullPath,
        success: function (response) {
            if (debugLogsEnabled) {
                console.log(response);
            }
            callback(response);
        },
        contentType: "application/json",
        data: data,
        dataType: 'json',
        timeout: defaultTimeout,
        error: function (jqXHR, textStatus, erroThrown) {
            callback(0);
        }
    });
}

function getSoundcloudTrackId(url, callback) {
    var soundcloudRegex = 'url=.+tracks%2F([^&]+).+';
    jQuery.ajax({
        type: 'POST',
        url: 'http://soundcloud.com/oembed?url=' + url,
        success: function (result) {
            var iframetext = $(result).find("html").text();
            if (iframetext.indexOf('tracks')) {
                var trackId = iframetext.match(soundcloudRegex)[1];

                callback(trackId);
            } else {
                callback(null);
            }
        }
    });
}

function validUrl(url) {
    for (var i = 0; i < validUrlPatterns.length; i++) {
        var pattern = validUrlPatterns[i];
        if (url.match(pattern)) {
            return true;
        }
    }

    if (isDirectLink(url)) {
        return true;
    }

    return false;
}

function isDirectLink(url) {
    return isDirectVideoLink(url) || isDirectAudioLink(url);
}

function isDirectVideoLink(url) {
    for (var i = 0; i < supportedVideoExtensions.length; i++) {
        var extension = supportedVideoExtensions[i];
        var regex = '.*\.' + extension;
        if (url.match(regex)) {
            return true;
        }
    }

    return false;
}

function isDirectAudioLink(url) {
    for (var j = 0; j < supportedAudioExtensions.length; j++) {
        var extension1 = supportedAudioExtensions[j];
        var regex1 = '.*\.' + extension1;
        if (url.match(regex1)) {
            return true;
        }
    }

    return false;
}

function validPlaylistUrl(url) {
    for (var i = 0; i < validPlaylistPatterns.length; i++) {
        var pattern = validPlaylistPatterns[i];
        if (url.match(pattern)) {
            return true;
        }
    }

    return false;
}

function validVideoPage(url, callback) {
    if (validUrl(url)) {
        callback();
    } else {
        chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(tab.id, {action: 'isValid'}, function (response) {
                if (response) {
                    callback();
                }
            });
        });
    }
}

function clearPlaylist(callback) {
    var clearVideoPlaylist = '{"jsonrpc": "2.0", "method": "Playlist.Clear", "params":{"playlistid":1}, "id": 1}';
    var clearAudioPlaylist = '{"jsonrpc": "2.0", "method": "Playlist.Clear", "params":{"playlistid":0}, "id": 1}';

    ajaxPost(clearVideoPlaylist, function () {
        ajaxPost(clearAudioPlaylist, function (response) {
            callback(response);
        });
    });
}

function addItemsToPlaylist(items, callback) {
    if (!items || items.length <= 0) {
        callback(null);
        return;
    }
    // assuming all of the same type
    var contentType = items[0].contentType;
    if (contentType != 'picture') {
        getPlaylistId(contentType, function (playlistId) {
            getActivePlayerId(function (playerId) {
                //if nothing is playing, clear the playlist
                if (playerId == null) {
                    clearPlaylist(function() {});
                }
                var addToPlaylist = "[";
                for (var i = 0; i < items.length; i++) {
                    if (i > 0) {
                        addToPlaylist += ",";
                    }
                    addToPlaylist += '{"jsonrpc": "2.0", "method": "Playlist.Add", "params":{"playlistid":' + playlistId + ', "item" :{ "file" : "' + items[i].pluginPath + '" }}, "id" :' + (i + 1) + '}';
                }
                addToPlaylist += "]";

                ajaxPost(addToPlaylist, function (response) {
                    var playVideo = '{"jsonrpc": "2.0", "method": "Player.Open", "params":{"item":{"playlistid":' + playlistId + ', "position" : 0}}, "id": 1}';

                    //if nothing is playing, play what we inserted
                    if (playerId == null) {
                        ajaxPost(playVideo, function (response_2) {
                            callback(response_2);
                        }, 10000);
                    } else {
                        callback(response);
                    }
                });
            });
        });
    } else {
        var playImage = '{"jsonrpc": "2.0", "method": "Player.Open", "params":{"item":{ "file" : "' + items[0].pluginPath + '" }}, "id": 1}';
        ajaxPost(playImage, function () {});
    }
}

function insertItemToPlaylist(contentType, pluginPath, position, callback) {
    getPlaylistId(contentType, function (playlistId) {
        var insertToPlaylist = '{"jsonrpc": "2.0", "method": "Playlist.Insert", "params":{"playlistid":' + playlistId + ', "position": ' + position + ', "item" :{ "file" : "' + pluginPath + '" }}, "id" : 1}';

        ajaxPost(insertToPlaylist, function (response) {
            callback(response);
        });
    });
}

function removeItemFromPlaylist(position, callback) {
    getActivePlayerId(function (playlistId) {
        var removeFromPlaylist = '{"jsonrpc": "2.0", "method": "Playlist.Remove", "params":{"playlistid":' + playlistId + ', "position": ' + position + '}, "id" : 1}';

        ajaxPost(removeFromPlaylist, function (response) {
            callback(response);
        });
    });
}

function getActivePlayerId(callback) {
    var getActivePlayers = '{"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}';

    ajaxPost(getActivePlayers, function (response) {
        if (response && response.result.length > 0) {
            var playerid = response.result[0].playerid;
            var type = response.result[0].type;
            callback(playerid, type);
        } else {
            callback(null, null);
        }
    });
}

function clearNonPlayingPlaylist(callback) {
    getActivePlayerId(function (playerid) {
        if (playerid == null) {
            //If nothing is playing, clear the list, probably left over from before
            clearPlaylist(function () {
            });
        }
        callback();
    });
}

function playerSeek(value) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var playerseek = '{"jsonrpc": "2.0", "method": "Player.Seek", "params":{"playerid":' + playerid + ', "value":"' + value + '"}, "id" : 1}';
            ajaxPost(playerseek, function () {
                onChangeUpdate()
            });
        }
    });
}

function playerGoPrevious(callback) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var version = localStorage["jsonVersion"];
            var playerPreviousV6 = '{"jsonrpc": "2.0", "method": "Player.GoTo", "params":{"playerid":' + playerid + ', "to":"previous"}, "id" : 1}';

            if (version >= 6) {
                ajaxPost(playerPreviousV6, function () {
                    callback()
                }, 10000);

            } else if (version >= 4) {
                doAction(actions.GoPrevious, function () {
                    callback()
                });

            }
        }
    });
}

function playerGoNext(callback) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var version = localStorage["jsonVersion"];
            var playerNextV6 = '{"jsonrpc": "2.0", "method": "Player.GoTo", "params":{"playerid":' + playerid + ', "to":"next"}, "id" : 1}';

            if (version >= 6) {
                ajaxPost(playerNextV6, function () {
                    callback()
                }, 10000);

            } else if (version >= 4) {
                doAction(actions.GoNext, function () {
                    callback()
                });

            }
        }
    });
}

function navigate(type) {
    var navigateTo = '{"jsonrpc": "2.0", "method": "Input.' + type + '", "id": 1}';

    ajaxPost(navigateTo, function () {
    }, 1000);
}

function getXbmcJsonVersion(callback) {
    var getJsonVersion = '{"jsonrpc": "2.0", "method": "JSONRPC.Version", "id" : 1}';

    ajaxPost(getJsonVersion, function (response) {
        if (response && response.result) {
            var version = response.result.version.major;
            if (!version) {
                version = response.result.version;
            }
            callback(version);
        } else {
            callback(null);
        }
    }, 2000);
}

function getRepeatMode(callback) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var playerRepeat = '{"jsonrpc": "2.0", "method": "Player.GetProperties", "params":{"playerid":' + playerid + ', "properties":["repeat"]}, "id" : 1}';

            ajaxPost(playerRepeat, function (response) {
                if (response && response.result && response.result.repeat) {
                    callback(response.result.repeat);
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    });
}

function getSpeed(callback) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var playerRepeat = '{"jsonrpc": "2.0", "method": "Player.GetProperties", "params":{"playerid":' + playerid + ', "properties":["speed"]}, "id" : 1}';

            ajaxPost(playerRepeat, function (response) {
                if (response && response.result && response.result.speed) {
                    callback(response.result.speed);
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    });
}

function setRepeatMode(mode, callback) {
    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var playerSetRepeatV6 = '{"jsonrpc": "2.0", "method": "Player.SetRepeat", "params":{"playerid":' + playerid + ', "repeat":"' + mode + '"}, "id" : 1}';
            var playerSetRepeatV4 = '{"jsonrpc": "2.0", "method": "Player.Repeat", "params":{"playerid":' + playerid + ', "state":"' + mode + '"}, "id" : 1}';

            var version = localStorage["jsonVersion"];

            if (version >= 6) {
                ajaxPost(playerSetRepeatV6, function (response) {
                    callback(response);
                });

            } else if (version >= 4) {
                ajaxPost(playerSetRepeatV4, function (response) {
                    callback(response);
                });

            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}

function getPlaylistPosition(callback) {

    getActivePlayerId(function (playerid) {
        if (playerid != null) {
            var getQueuePosition = '{"jsonrpc": "2.0", "method": "Player.GetProperties", "params":{"playerid":' + playerid + ', "properties":["position"]}, "id" : 1}';

            ajaxPost(getQueuePosition, function (response) {
                if (response && response.result) {
                    var position = response.result.position;
                    callback(position);
                }
            });
        } else {
            callback(null);
        }
    });
}

function getActivePlaylistSize(callback) {
    getActivePlayerId(function (playerid, type) {
        if (playerid != null && type != null) {
            getPlaylistId(type, function (playlistId) {
                if (playlistId != null) {
                    getPlaylistSize(playlistId, function (playlistSize) {
                        if (playlistSize != null) {
                            callback(playlistSize);
                        } else {
                            callback(null);
                        }
                    });
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    });
}

function getPlaylistSize(playlistId, callback) {
    var getCurrentPlaylist = '{"jsonrpc": "2.0", "method": "Playlist.GetItems", "params":{"playlistid":' + playlistId + '}, "id": 1}';

    ajaxPost(getCurrentPlaylist, function (response) {
        if (response && response.result && response.result.items) {
            var playlistSize = response.result.items.length;
            callback(playlistSize);
        } else {
            callback(null);
        }
    });
}

function getPlaylistId(type, callback) {
    var getPlaylistId = '{"jsonrpc": "2.0", "method": "Playlist.GetPlaylists", "id": 1}';

    ajaxPost(getPlaylistId, function (response) {
        if (response && response.result.length > 0) {
            var playlists = response.result;
            for (var i = 0; i < playlists.length; i++) {
                if (playlists[i].type == type) {
                    callback(playlists[i].playlistid);
                }
            }
        } else {
            callback(null);
        }
    });
}

function getVolumeLevel(callback) {
    var getVolumeLevel = '{"jsonrpc": "2.0", "method": "Application.GetProperties", "params":{"properties":["volume"]}, "id" : 1}';

    ajaxPost(getVolumeLevel, function (response) {
        if (response && response.result) {
            callback(response.result["volume"]);
        } else {
            callback(null);
        }
    });
}

function getPlayerTimes(playerId, callback) {
    var getPlayerTimes = '{"jsonrpc":"2.0", "method":"Player.GetProperties", "params":{"playerid":' + playerId + ', "properties":["time", "totaltime"]},"id":1}';

    ajaxPost(getPlayerTimes, function(response) {
        if (response && response.result) {
            var timeInSeconds = toSeconds(response.result.time["hours"], response.result.time["minutes"], response.result.time["seconds"]);
            var totalTimeInSeconds = toSeconds(response.result.totaltime["hours"], response.result.totaltime["minutes"], response.result.totaltime["seconds"]);

            callback(
                timeInSeconds,
                totalTimeInSeconds
            );
        } else {
            callback(null);
        }
    });
}

function toSeconds(hours, minutes, seconds) {
    var secondsInHour = 3600;
    var secondsInMinute = 60;
    var totalSeconds = 0;

    totalSeconds = seconds + (minutes*secondsInMinute) + (hours*secondsInHour);

    return totalSeconds
}