/*
 * main AngularJS code for wmp
 * version 1.5.0
 */
'use strict';
angular
//declare module and dependencies
.module('wmpApp', ['ngResource', 'ngRoute', 'ng-sortable', 'angular-loading-bar', 'ngAnimate'])
//declare configuration
.config(config)
//declare tooltip service
.service('Tooltip', ['$animate', '$timeout', '$compile', '$rootScope', Tooltip])
//declare playlist service
.service('Playlist', ['LocalUser', 'Tooltip', 'PlaylistItem', Playlist])
//declare player controller
.controller('PlayerController', ['$scope', 'Playlist', 'PlaylistItem', 'Tooltip', 'Audio', 'LocalUser', '$window', '$http', PlayerController])
//declare menu controller
.controller('MenuController', ['LocalUser', '$window', '$scope', MenuController])
//declare library controller
.controller('LibraryController', ['Library', 'Tooltip', 'Playlist', '$filter', LibraryController])
//declare catalog controller
.controller('CatalogController', ['Library', 'Folder', '$q', CatalogController])
//declare sign-out controller
.controller('SignOutController', ['LocalUser', '$window', SignOutController])
//declare profile controller
.controller('UserController', ['LocalUser', 'User', 'Tooltip', '$routeParams', UserController])
//declare users management controller
.controller('UsersController', ['User', 'Tooltip', UsersController])
//declare album controller
.controller('AlbumController', ['$routeParams', '$location', 'Tooltip', 'Playlist', 'Album', 'MusicBrainz', AlbumController])
//declare artist controller
.controller('ArtistController', ['$routeParams', '$location', 'Tooltip', 'Playlist', 'Artist', 'MusicBrainz', ArtistController])
//declare track controller
.controller('TrackController', ['$routeParams', 'Tooltip', 'Library', TrackController])
//declare settings controller
.controller('SettingsController', ['Setting', SettingsController])
//declare filter converting duration in seconds into a datetime
.filter('duration', duration)
//declare image missing directive
.directive('ngErrSrc', errSrc);
//tooltip function
function Tooltip($animate, $timeout, $compile, $rootScope) {
    var tooltip = this;
    tooltip.display = display;
    function display(data, delay, style) {
        //choose icon
        var icon = '';
        switch (style) {
            case 'info':
                var icon = '<i class="fa fa-info-circle"></i> ';
                break;
            case 'error':
                var icon = '<i class="fa fa-warning"></i> ';
                break;
        }
        //create local scope
        var scope = $rootScope.$new();
        scope.removeTooltip = removeTooltip;
        var template = '<div class="tooltip-container"><div class="tooltip">' + icon + data + ' <button class="button-icon tooltip-close" ng-click="removeTooltip($event);"><i class="fa fa-close"></i></button></div></div>';
        var tooltipElement = $compile(template)(scope);
        var parentElement = document.querySelector('body');
        //add tooltip
        $animate.enter(tooltipElement, parentElement);
        //handle tooltip removing if a delay is provided
        if (delay && delay !== 0) {
            $timeout(function() {
                $animate.leave(tooltipElement);
                scope.$destroy();
            }, delay);
        }
        //manual removing function
        function removeTooltip(element) {
            $animate.leave(angular.element(element.currentTarget).parent().parent());
            scope.$destroy();
        }
    }
}
//playlist function
function Playlist(LocalUser, Tooltip, PlaylistItem) {
    var playlist = this;
    //get tracks
    playlist.tracks = PlaylistItem.query({userId: LocalUser.id}, function () {}, function (error) {
        //function for handling API error
        if (error.status === -1) {
            Tooltip.display('Can not access to your current playlist, please check your internet connection or try again later', 5000, 'error');
        }
    });
    //initialize current track
    playlist.currentTrack = 0;
    //declare function for add track in playlist
    playlist.add = add;
    playlist.addAlbum = addAlbum;
    playlist.addArtist = addArtist;
    //function to add a track to the user playlist
    function add(track) {
        var playlistItem = new PlaylistItem(track);
        playlistItem.userId = LocalUser.id;
        PlaylistItem.save(playlistItem, function(data) {
            //success, add to playlist
            playlist.tracks.push(data);
            //notify user with a tooltip
            Tooltip.display('Track "' + track.title + '" added to your playlist', 2000, 'info');
        }, function(error) {
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not access to your current playlist, please check your internet connection or try again later', 5000, 'error');
                return;
            }
            if (error.data && error.data.message) {
                //catched error
                Tooltip.display(error.data.message, 5000, 'error');
                return;
            }
        });
    }
    //function to add tracks to the user playlist
    function addTracks (tracks, title) {
        PlaylistItem.addTracks({userId:LocalUser.id }, tracks, function(data) {
            //success, refresh playlist
            playlist.tracks = data;
            //notify user with a tooltip
            Tooltip.display(title + ' added to your playlist', 2000, 'info');
        }, function(error) {
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not access to your current playlist, please check your internet connection or try again later', 5000, 'error');
                return;
            }
            if (error.data && error.data.message) {
                //catched error
                Tooltip.display(error.data.message, 5000, 'error');
                return;
            }
        });
    }
    //function to add album's tracks to the user playlist
    function addAlbum (album) {
        var tracks = [];
        for (var i = 0; i < album.tracks.length; i++) {
            var track = {id:album.tracks[i].id};
            tracks.push(track);
        }
        addTracks(tracks, 'Album "' + album.name + '"');
    }
    //function to add artist's tracks to the user playlist
    function addArtist (artist) {
        var tracks = [];
        for (var i = 0; i < artist.tracks.length; i++) {
            var track = {id:artist.tracks[i].id};
            tracks.push(track);
        }
        addTracks(tracks, 'Artist "' + artist.name + '"');
    }
}
//PlayerController function
function PlayerController($scope, Playlist, PlaylistItem, Tooltip, Audio, LocalUser, $window, $http) {
    var player = this;
    //check user profile
    player.user = LocalUser;
    if (!player.user.getProfile() || (typeof player.user.id !== 'number')) {
        $window.location = '/sign';
        //redirect to sign in page
        return false;
    }
    //create player
    var audio = Audio;
    player.isPlaying = false;
    player.isPaused = false;
    player.currentTime = 0;
    player.duration = 0;
    player.coverPath = '/display/files/images/default_cover.png';
    //declare functions for controlling player
    player.play = play;
    player.pause = pause;
    player.previous = previous;
    player.next = next;
    player.seek = seek;
    //automatic handlers
    audio.onended = onEnded;
    audio.ontimeupdate = onTimeUpdate;
    audio.ondurationchange = onDurationChange;
    //link playlist to Playlist service
    player.playlist = Playlist;
    //add to PLaylist service the removing track function
    player.playlist.remove = remove;
    //sort playlist
    player.playlistSort = {
        draggable: '.track',
        handle: '.track-handle',
        filter: '.grid-header',
        sort: true,
        animation: 1000,
        onUpdate: function(evt) {
            //apply local change
            if (evt.oldIndex < player.playlist.currentTrack && evt.newIndex >= player.playlist.currentTrack) {
                player.playlist.currentTrack--;
            } else if (evt.oldIndex > player.playlist.currentTrack && evt.newIndex <= player.playlist.currentTrack) {
                player.playlist.currentTrack++;
            } else if (evt.oldIndex === player.playlist.currentTrack) {
                player.playlist.currentTrack = evt.newIndex;
            }
            //update playlist on server
            if (evt.newIndex > evt.oldIndex) {
                evt.model.newSequence = player.playlist.tracks[evt.newIndex - 1].sequence;
            } else if (evt.newIndex < evt.oldIndex) {
                evt.model.newSequence = player.playlist.tracks[evt.newIndex + 1].sequence;
            }
            var playlistItem = new PlaylistItem(evt.model);
            PlaylistItem.update(playlistItem, function(data) {
                //success, apply display change
                player.playlist.tracks = data;
            }, function(error) {
                //handling API error
                if (error.status === -1) {
                    Tooltip.display('Can not access to your current playlist, please check your internet connection or try again later', 5000, 'error');
                    return;
                }
                if (error.data && error.data.message) {
                    //catched error
                    Tooltip.display(error.data.message, 5000, 'error');
                    return;
                }
            });
        }
    };
    //function for playing current track in playlist
    function play(trackIndex) {
        if (!audio.src) {
            //first use of the audio element, force a play while handle user interaction (issue on Chrome mobile)
            audio.play();
        }
        if (this.playlist.tracks.length > 0 && this.playlist.tracks.length > this.playlist.currentTrack) {
            if (this.isPaused && !angular.isDefined(trackIndex)) {
                //resume the playing (only if there is no specific track asked)
                audio.play();
                player.isPlaying = true;
                player.isPaused = false;
            } else {
                //load new track and play it
                if (angular.isDefined(trackIndex)) {
                    this.playlist.currentTrack = trackIndex;
                }
                $http.get(this.playlist.tracks[this.playlist.currentTrack].file, {cache: true})
                .then(function successCallback(response) {
                    //track is loaded, update src attribute and start playing
                    audio.src = response.data;
                    audio.play();
                    //update cover
                    if (player.playlist.tracks[player.playlist.currentTrack].album.coverPath) {
                        player.coverPath = player.playlist.tracks[player.playlist.currentTrack].album.coverPath;
                    } else {
                        player.coverPath = '/display/files/images/default_cover.png';
                    }
                    player.currentTime = 0;
                    player.isPlaying = true;
                    player.isPaused = false;
                }, function errorCallback(error) {
                    player.pause();
                    if (error.status === -1) {
                        Tooltip.display('Can not access to the server, please check your internet connection or try again later', 5000, 'error');
                    }
                    if (error.data && error.data) {
                        //catched error
                        Tooltip.display(error.data, 5000, 'error');
                    }
                });
            }
        }
    }
    //function to pause the playing
    function pause() {
        audio.pause();
        this.isPaused = true;
        this.isPlaying = false;
    }
    //function for playing previous track in playlist
    function previous() {
        if (!this.playlist.tracks.length) {
            return;
        }
        this.isPaused = false;
        if (this.playlist.currentTrack > 0) {
            //go to previous track
            this.playlist.currentTrack--;
        } else {
            //go to the last track
            this.playlist.currentTrack = this.playlist.tracks.length - 1;
        }
        this.play();
    }
    //function for playing next track in playlist
    function next() {
        if (!this.playlist.tracks.length) {
            //there is no track to play, stop the playing
            audio.pause();
            this.isPaused = true;
            this.isPlaying = false;
            return;
        }
        if (this.playlist.tracks.length > (this.playlist.currentTrack + 1)) {
            //go to next track
            this.playlist.currentTrack++;
        } else {
            //come back to the first track
            this.playlist.currentTrack = 0;
        }
        this.play(this.playlist.currentTrack);
    }
    //function for seeking in track
    function seek() {
        audio.currentTime = this.currentTime;
    }
    //function to remove a track from the user playlist
    function remove(track) {
        track.$delete(function() {
            //success, apply display change
            var trackRemovedIndex = player.playlist.tracks.indexOf(track);
            var currentTrack = player.playlist.currentTrack;
            //remove track from the playlist
            player.playlist.tracks.splice(trackRemovedIndex, 1);
            //update currentTrack index
            if (currentTrack >= trackRemovedIndex) {
                if (currentTrack >= 0) {
                    player.playlist.currentTrack--;
                }
                //go to next track if the removed track was playing
                if (player.isPlaying && currentTrack === trackRemovedIndex) {
                    player.next();
                }
                if (player.playlist.currentTrack < 0) {
                    player.playlist.currentTrack = 0;
                }
            }
        }, function(error) {
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not access to your current playlist, please check your internet connection or try again later', 5000, 'error');
                return;
            }
            if (error.data && error.data.message) {
                //catched error
                Tooltip.display(error.data.message, 5000, 'error');
                return;
            }
        });
    }
    //automatic call to the next function when track is ended
    function onEnded() {
        $scope.$apply(player.next());
    }
    //automatic update seeker
    function onTimeUpdate() {
        $scope.$apply(player.currentTime = this.currentTime);
    }
    //automatic update seeker max range
    function onDurationChange() {
        $scope.$apply(player.duration = this.duration);
    }
}
//LibraryController function
function LibraryController(Library, Tooltip, Playlist, $filter) {
    var librarys = this;
    //get library
    librarys.tracks = [];
    librarys.order = ['title', 'album', 'artist'];
    librarys.tracksFiltered = [];
    librarys.pagesCount = 1;
    librarys.currentPage = 1;
    librarys.itemsPerPage = 50;
    librarys.setPage = setPage;
    librarys.updateOrder = updateOrder;
    librarys.search = {
        artist: null,
        album: null,
        title: null,
        displayFilter: {
            artist: false,
            album: false,
            title: false
        },
        query: function() {
            librarys.tracks = Library.query({
                title: this.title,
                album: this.album,
                artist: this.artist
            }, function() {
                //update pagination system when query ends
                librarys.currentPage = 1;
                updateFilteredItems();
            }, function (error) {
                //function for handling API error
                if (error.status === -1) {
                    Tooltip.display('Can not access to library, please check your internet connection or try again later', 5000, 'error');
                }
            });
        }
    };
    //add link to Playlist service ("add track to playlist" function)
    librarys.add = Playlist.add;
    librarys.search.query();
    //declare function for setting page number
    function setPage(currentPage) {
        librarys.currentPage = currentPage;
        updateFilteredItems();
    }
    //declare function for update order and apply the update on the filtered items
    function updateOrder(order) {
        librarys.order = order;
        updateFilteredItems();
    }
    //declare function for update pagination system
    function updateFilteredItems() {
        var begin = ((librarys.currentPage - 1) * librarys.itemsPerPage);
        var end = begin + librarys.itemsPerPage;
        librarys.tracks = $filter('orderBy')(librarys.tracks, librarys.order);
        librarys.tracksFiltered = librarys.tracks.slice(begin, end);
        librarys.pagesCount = Math.ceil(librarys.tracks.length / librarys.itemsPerPage);
    }
}
//MenuController function
function MenuController(LocalUser, $window, $scope) {
    var menu = this;
    menu.visible = false;
    menu.items = [];
    var existingItems = [
        {require: 'user', label: 'Player', icon: 'fa-headphones', link: '#/player'},
        {require: 'user', label: 'Library', icon: 'fa-archive', link: '#/library'},
        {require: 'admin', label: 'Catalog', icon: 'fa-folder-open', link: '#/catalog'},
        {require: 'user', label: 'Profile', icon: 'fa-user', link: '#/profile'},
        {require: 'admin', label: 'Users management', icon: 'fa-users', link: '#/users'},
        {require: 'admin', label: 'Settings', icon: 'fa-sliders', link: '#/settings'},
        {require: 'user', label: 'Sign out', icon: 'fa-sign-out', link: '#/sign-out'},
        {require: 'user', label: 'Find an issue ?', icon: 'fa-bug', link: 'https://github.com/nioc/web-music-player/issues/new'},
        {require: 'user', label: 'Contribute', icon: 'fa-code-fork', link: 'https://github.com/nioc/web-music-player#contributing'}
   ];
    menu.currentPage = existingItems[0];
    menu.toggle = toggle;
    //check user profile
    var user = LocalUser;
    if (!user.getProfile() || (typeof user.id !== 'number')) {
        $window.location = '/sign';
        //no valid token found, redirect to sign in page
        return false;
    }
    //add links according to user scope
    var scope = user.scope.split(' ');
    angular.forEach(existingItems, function(item) {
        if (scope.indexOf(item.require) !== -1) {
            item.isCurrentPage = isCurrentPage;
            item.setCurrentPage = setCurrentPage;
            menu.items.push(item);
        }
    });
    //location listener
    $scope.$on('$locationChangeSuccess', locationChangeSuccess);
    //toggle menu display
    function toggle() {
        this.visible = !this.visible;
    }
    //highlight current page
    function isCurrentPage() {
        return this.link === $window.location.hash;
    }
    //store the next page and hide menu
    function setCurrentPage() {
        menu.currentPage = this;
        menu.toggle();
    }
    function locationChangeSuccess(event) {
        //browser location detected, check if menu is synchronized
        if (menu.currentPage.link !== $window.location.hash) {
            //try to found the active item
            var i = 0;
            var itemFound = false;
            while (i < existingItems.length && !itemFound) {
                if (existingItems[i].link === $window.location.hash) {
                    //active item found, update menu.currentPage
                    itemFound = true;
                    menu.currentPage = existingItems[i];
                }
                i++;
            }
            if (!itemFound) {
                //active item not found, apply default values
                menu.currentPage = {require: 'user', label: 'WMP', icon: 'fa-headphones', link: $window.location.hash};
            }
        }
    }
}
//CatalogController function
function CatalogController(Library, Folder, $q) {
    var catalog = this;
    catalog.result = '';
    catalog.isProcessing = false;
    catalog.progress = 0;
    catalog.folders = Folder.query();
    catalog.expandFolder = function(folder) {
        folder.show = !folder.show;
    };
    catalog.addFolder = function(folder) {
        catalog.result = 'Processing, please wait.';
        //retrieve subfolders with files
        var folderPathsWithFiles = new Array();
        var filesCounter = 0;
        var filesProcessed = 0;
        catalog.isProcessing = true;
        //declare recursive function for retreiving folders with files
        function handleFolder(folder) {
            if (folder.files.length > 0) {
                //there are files under this subfolder, add it to the array and update files counter
                folderPathsWithFiles.push(folder.path);
                filesCounter += folder.files.length;
            }
            for (var i = 0; i < folder.subfolders.length; i++) {
                handleFolder(folder.subfolders[i]);
            }
        }
        //call recursive function
        handleFolder(folder);
        //sequential calls API for each folder
        var previous = $q.when(null);
        for (var i = 0; i < folderPathsWithFiles.length; i++) {
            (function(i) {
                previous = previous.then(function() {
                    return Library.save({'folder': folderPathsWithFiles[i]}, function(data) {
                        //success, display progression
                        filesProcessed += data.data.length;
                        catalog.progress = parseInt(100 * filesProcessed / filesCounter);
                        catalog.result = 'Processing, please wait (' + catalog.progress + '%)';
                    }).$promise;
                });
            }(i));
        }
        previous.then(function() {
            //success, remove popin and display end message
            catalog.result = 'Tracks processing is done';
            catalog.isProcessing = false;
        }, function(error) {
            //error, remove popin and display error message
            catalog.result = 'Tracks processing encounter an error: ' + error.data.message + ' on ' + error.config.data.folder;
            catalog.isProcessing = false;
        });
    };
}
//SignOutController function
function SignOutController(LocalUser, $window) {
    LocalUser.deleteToken();
    $window.location = '/sign';
}
//ProfileController function
function UserController(LocalUser, User, Tooltip, $routeParams) {
    var profile = this;
    profile.result = {text: '', class: ''};
    profile.submit = submit;
    if ($routeParams && $routeParams.id) {
        if (parseInt($routeParams.id)) {
            //edit existing user, get his profile from url id parameter
            profile.user = User.get({id: $routeParams.id}, function() {}, function (error){
                //handling API error
                if (error.status === -1) {
                    Tooltip.display('Can not access to user profile, please check your internet connection or try again later', 5000, 'error');
                    return;
                }
                if (error.data && error.data.message) {
                    //catched error
                    Tooltip.display(error.data.message, 5000, 'error');
                    return;
                }
            });
            profile.title = 'Edit user';
            profile.scopeEditable = true;
        } else {
            //add user form
            profile.user = new User();
            profile.submit = addUser;
            profile.title = 'Create user';
            profile.scopeEditable = true;
        }
    } else {
        //edit current user, get his local profile
        LocalUser.getProfile();
        profile.user = User.get({id: LocalUser.id}, function() {}, function (error){
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not access to your profile, please check your internet connection or try again later', 5000, 'error');
                return;
            }
            if (error.data && error.data.message) {
                //catched error
                Tooltip.display(error.data.message, 5000, 'error');
                return;
            }
        });
        profile.title = 'Edit your profile';
        profile.scopeEditable = false;
    }
    //function for creating user profile
    function addUser() {
        function successCallback() {
            profile.result.text = 'Profile successfully created';
            profile.result.class = 'form-valid';
        }
        function errorCallback(error) {
            profile.result.text = 'Error, profile not created';
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not create user, please check your internet connection or try again later', 5000, 'error');
            }
            if (error.data && error.data.message) {
                profile.result.text = error.data.message;
            }
            profile.result.class = 'form-error';
        }
        profile.user.$save(successCallback, errorCallback);
    }
    //function for saving user profile modifications
    function submit() {
        function successCallback() {
            profile.result.text = 'Profile successfully updated';
            profile.result.class = 'form-valid';
        }
        function errorCallback(error) {
            profile.result.text = 'Error, profile not updated';
            //handling API error
            if (error.status === -1) {
                Tooltip.display('Can not update user, please check your internet connection or try again later', 5000, 'error');
            }
            if (error.data && error.data.message) {
                profile.result.text = error.data.message;
            }
            profile.result.class = 'form-error';
        }
        profile.user.$update(successCallback, errorCallback);
    }
}
//UsersController function
function UsersController(User, Tooltip) {
    var usersManagement = this;
    usersManagement.users = User.query({}, function () {}, function (error) {
        //handling API error
        if (error.status === -1) {
            Tooltip.display('Can not access to users management, please check your internet connection or try again later', 5000, 'error');
            return;
        }
        if (error.data && error.data.message) {
            //catched error
            Tooltip.display(error.data.message, 5000, 'error');
            return;
        }
    });
}
//AlbumController function
function AlbumController($routeParams, $location, Tooltip, Playlist, Album, MusicBrainz) {
    var album = this;
    album.album = Album.get({id: $routeParams.id}, function () {}, errorCallback);
    album.editMode = false;
    album.MusicBrainzResults = [];
    album.remove = remove;
    album.edit = edit;
    album.save = save;
    album.searchMusicBrainz = searchMusicBrainz;
    album.useMusicBrainz = useMusicBrainz;
    //add link to Playlist service ("add track to playlist" function)
    album.add = Playlist.add;
    album.addTracks = Playlist.addAlbum;
    function remove() {
        if (confirm('This will delete "' + album.album.name + '" album from the library, are you sure?')) {
            album.album.$delete(function() {$location.path('/library').replace();}, errorCallback);
        }
    }
    function edit() {
        album.editMode = true;
    }
    function successCallback() {
        album.editMode = false;
    }
    function errorCallback(error) {
        //handling API error
        if (error.status === -1) {
            Tooltip.display('Can not access to this album, please check your internet connection or try again later', 5000, 'error');
            return;
        }
        if (error.data && error.data.message) {
            //catched error
            Tooltip.display(error.data.message, 5000, 'error');
            return;
        }
    }
    function save() {
        album.album.$update(successCallback, errorCallback);
    }
    function searchMusicBrainz() {
        album.MusicBrainzResults = MusicBrainz.query({type: 'albums', title: album.album.name, artist: album.album.artist.label});
    }
    function useMusicBrainz(musicBrainzAlbum) {
        album.album.name = musicBrainzAlbum.name;
        album.album.country = musicBrainzAlbum.country;
        album.album.year = musicBrainzAlbum.year;
        album.album.mbid = musicBrainzAlbum.mbid;
        album.album.coverPath = musicBrainzAlbum.coverPath;
    }
}
//ArtistController function
function ArtistController($routeParams, $location, Tooltip, Playlist, Artist, MusicBrainz) {
    var artist = this;
    artist.artist = Artist.get({id: $routeParams.id}, function () {}, errorCallback);
    artist.editMode = false;
    artist.MusicBrainzResults = [];
    artist.remove = remove;
    artist.edit = edit;
    artist.save = save;
    artist.searchMusicBrainz = searchMusicBrainz;
    artist.useMusicBrainz = useMusicBrainz;
    //add link to Playlist service ("add track to playlist" function)
    artist.add = Playlist.add;
    artist.addTracks = Playlist.addArtist;
    function remove() {
        if (confirm('This will delete "' + artist.artist.name + '" artist from the library and all his tracks, are you sure?')) {
            artist.artist.$delete(function() {$location.path('/library').replace();}, errorCallback);
        }
    }
    function edit() {
        artist.editMode = true;
    }
    function successCallback() {
        artist.editMode = false;
    }
    function errorCallback(error) {
        //handling API error
        if (error.status === -1) {
            Tooltip.display('Can not access to this artist, please check your internet connection or try again later', 5000, 'error');
            return;
        }
        if (error.data && error.data.message) {
            //catched error
            Tooltip.display(error.data.message, 5000, 'error');
            return;
        }
    }
    function save() {
        artist.artist.$update(successCallback, errorCallback);
    }
    function searchMusicBrainz() {
        artist.MusicBrainzResults = MusicBrainz.query({type: 'artists', name: artist.artist.name});
    }
    function useMusicBrainz(musicBrainzArtist) {
        artist.artist.name = musicBrainzArtist.name;
        artist.artist.country = musicBrainzArtist.country;
        artist.artist.summary = musicBrainzArtist.summary;
        artist.artist.mbid = musicBrainzArtist.mbid;
    }
}
//TrackController function
function TrackController($routeParams, Tooltip, Library) {
    var track = this;
    track.track = Library.get({id: $routeParams.id}, function () {}, errorCallback);
    track.editMode = false;
    track.edit = edit;
    track.save = save;
    function edit() {
        track.editMode = true;
    }
    function successCallback() {
        track.editMode = false;
    }
    function errorCallback(error) {
        //handling API error
        if (error.status === -1) {
            Tooltip.display('Can not access to this track, please check your internet connection or try again later', 5000, 'error');
            return;
        }
        if (error.data && error.data.message) {
            //catched error
            Tooltip.display(error.data.message, 5000, 'error');
            return;
        }
    }
    function save() {
        track.track.$update(successCallback, errorCallback);
    }
}
//SettingsController function
function SettingsController(Setting) {
    var panel = this;
    panel.settings = Setting.query();
    panel.edit = edit;
    panel.save = save;
    //switch in edition mode
    function edit(setting) {
        setting.edit = true;
    }
    //save current setting
    function save(setting) {
        delete setting.edit;
        setting.$update();
    }
}
//duration filter function
function duration() {
    return function(seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}
//image missing function
function errSrc() {
    return {
        link(scope, element, attrs) {
            element.bind('error', function() {
                if (attrs.src !== attrs.ngErrSrc) {
                    attrs.$set('src', attrs.ngErrSrc);
                }
            });
        }
    };
}
//Configuration function
function config($routeProvider, cfpLoadingBarProvider) {
    $routeProvider
    .when('/player', {
    })
    .when('/library', {
        templateUrl: '/library',
        controller: 'LibraryController',
        controllerAs: 'library'
    })
    .when('/albums/:id', {
        templateUrl: '/albums',
        controller: 'AlbumController',
        controllerAs: 'album'
    })
    .when('/artists/:id', {
        templateUrl: '/artists',
        controller: 'ArtistController',
        controllerAs: 'artist'
    })
    .when('/tracks/:id', {
        templateUrl: '/tracks',
        controller: 'TrackController',
        controllerAs: 'track'
    })
    .when('/catalog', {
        templateUrl: '/catalog',
        controller: 'CatalogController',
        controllerAs: 'catalog'
    })
    .when('/profile', {
        templateUrl: '/profile',
        controller: 'UserController',
        controllerAs: 'profile'
    })
    .when('/users', {
        templateUrl: '/users',
        controller: 'UsersController',
        controllerAs: 'usersManagement'
    })
    .when('/users/:id', {
        templateUrl: '/profile',
        controller: 'UserController',
        controllerAs: 'profile'
    })
    .when('/sign-out', {
        templateUrl: '/sign-out',
        controller: 'SignOutController'
    })
    .when('/settings', {
        templateUrl: '/settings',
        controller: 'SettingsController',
        controllerAs: 'panel'
    })
    .otherwise({
        redirectTo: '/player'
    });
    cfpLoadingBarProvider.spinnerTemplate = '<div class="spinner"><i class="fa fa-refresh fa-spin"></i></div>';
    cfpLoadingBarProvider.loadingBarTemplate = '<div class="loading-bar"><div class="bar"><div class="peg"></div></div></div>';
    cfpLoadingBarProvider.latencyThreshold = 50;
}
