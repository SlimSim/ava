$( document ).ready(function() {

    const meetingId = $( "#meetingId" ).val();
    const participantId = $( "#participantId" ).val();
    const socketUrl = thymeLeaf.contextPath + 'gs-guide-websocket';
	const requestUrl = thymeLeaf.contextPath + "ajax/singleRequest";
	const myRequestsUrl = thymeLeaf.contextPath + "meeting/" + meetingId + "/participants/" + participantId;
	console.log( "myRequestsUrl", myRequestsUrl);
    var stompClient = null,

    connect = function() {
        const funk = "connect";
        var socket = new SockJS( socketUrl );
        stompClient = Stomp.over(socket);
        stompClient.connect({}, function (frame) {
            console.log( funk + ": stompClient.connect function -> frame", frame );
            stompClient.subscribe('/topic/request', function (response) {
	            console.log( funk + ": stompClient.subscribe 'topic/request'-> response:", response );
                requestReceived( JSON.parse( response.body ) );
            });
        }, function( error ) {
			console.log( funk + ": error", error );
			continuouslyPullMyRequests();
		});
    },

    requestReceived = function( request ) {
        if( request.participantId != participantId ) {
            return;
        }
        $( "#" + request.requestType ).toggleClass( "active", request.active );
    },

    sendRequest = function(participantId, participantName, requestType, active) {
        const data = JSON.stringify( {
            "participantId": participantId,
            "participantName" : participantName,
            "requestType" : requestType,
            "active" : active
        } );

        if( stompClient != null && stompClient.connected ) {
	        stompClient.send( "/app/request", {}, data );
        } else {
	        $.ajax({
	            type : "POST",
		        contentType: "application/json",
	            url: requestUrl,
				data : data
	        })
	        .done( repopulateMyRequests );
        }

    },

    addTimeChanged = function( event ) {
        $( event.target ).data( "time-changed", Date.now() );
    },

    reconnectToMeeting = function( event ) {
		location.reload();
    },

    submitForm = function( event ) {
        event.preventDefault();

        var $target = $( event.target ),
            requestType = $target.attr( "id" ),
            participantName = $("#participantName").text(),
            active = !$target.hasClass( "active" );

        sendRequest(participantId, participantName, requestType, active);
    },

    getMyRequests = function( callback ){

        $.ajax({
            url: myRequestsUrl
        })
        .done( ( response ) => {
            if( response.status == "NOT_FOUND" ) {
                $( "#participantNoLongerInMeeting" ).modal( "show" );
                $( "#participantForm" ).find( "button" ).prop( "disabled", true);
                return;
            }
            if( response.status != "OK" ) {
                console.error( "error on get " + myRequestsUrl + ": ", response );
                alert( "Fel vid hämtnign av deltagarkö, försök igen" );
                return;
            }
	        repopulateMyRequests( response.payload );
	        callback && callback();
        } );

    },

    repopulateMyRequests = function( myRequests ) {

        $( "#breakingQuestion" ).toggleClass( "active", myRequests.breakingQuestion );
        $( "#comment" ).toggleClass( "active", myRequests.comment );
        $( "#information" ).toggleClass( "active", myRequests.information );
        $( "#requestToSpeak" ).toggleClass( "active", myRequests.requestToSpeak );
        $( "#voteNo" ).toggleClass( "active", myRequests.voteNo );
        $( "#voteYes" ).toggleClass( "active", myRequests.voteYes );

    },

    continuouslyPullMyRequests = function() {
        setTimeout( () => {
            getMyRequests( continuouslyPullMyRequests );
        }, thymeLeaf.myRequestsPullTimeout );
    };

	if( thymeLeaf.useWebSockets ) {
	    connect(); // webSockets
	} else {
        continuouslyPullMyRequests(); // noWebSockets;
	}

    $( ".request-button" ).on( "click", submitForm );

    $( "#reconnectToMeeting" ).on( "click", reconnectToMeeting )

    $( "[data-time-changed]" ).on( "click", addTimeChanged);

});

