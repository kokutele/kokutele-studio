import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'antd'
import { useAppContext } from '../libs/reducer'
import { GiCancel } from 'react-icons/gi'
import { IoMdPlay, IoMdPause, IoMdSkipBackward } from 'react-icons/io'
import { BsMicMuteFill, BsMicFill, BsCameraVideoFill, BsCameraVideoOffFill } from 'react-icons/bs'
import Logger from "../libs/logger"

import { defaultMic, defaultVideo } from '../config'

import './source-video.css'


const logger = new Logger('source-video')

// https://www.schemecolor.com/after-the-searching.php
const videoFrameColors = [
  '#FFA809',
  '#D54E6F',
  '#29317C',
  '#01C6A2',
  '#FDDB01'
]

export default function SourceVideo( props ) {
  const { 
    state, appData, 
    addStudioLayout, deleteStudioLayout, toMainInStudioLayout, 
    addParticipant, updateParticipantAudio, updateParticipantVideo, deleteParticipantByMediaId,
    deleteProducer, deleteLocalStream 
  } = useAppContext()
  const [ _videoWidth , setVideoWidth  ] = useState( 0 )
  const [ _videoHeight, setVideoHeight ] = useState( 0 )
  const [ _isVideo, setIsVideo ] = useState( false )
  const [ _layoutIdx, setLayoutIdx ] = useState( -1 )
  const [ _playing, setPlaying ] = useState( false )

  const {
    id, displayName, 
    audioConsumerId, audioProducerId, videoConsumerId, videoProducerId, 
    localStreamId, mediaId, idx 
  } = props

  const {
    roomClient, localStreams
  } = appData

  const _wrapperEl = useRef( null )
  const _videoEl = useRef( null )
  const _srcVideo = useRef( null )

  const _myParticipantInfo = useMemo( () => {
    return state.studio.participants.find( item => item.peerId === id && item.mediaId === mediaId )
     || { peerId: id, mediaId, displayName, audio: defaultMic, video: defaultVideo }
  }, [ state.studio.participants, id, mediaId, displayName ])

  // when video is clicked, toggle adding or deleting from studio layout.
  const handleClick = useCallback( () => {
    if( !videoProducerId ) {
      logger.warn( 'Meida not ready yet' )
    } else {
      if( 
        !state.studio.layout
          .find( item => ( 
            item.peerId === id && 
            item.audioProducerId === audioProducerId && 
            item.videoProducerId === videoProducerId 
          )) 
      ) {
        addStudioLayout({ 
          peerId: id, 
          audioProducerId, 
          videoProducerId,
          mediaId,
          videoWidth: _videoWidth,
          videoHeight: _videoHeight
        })
      } else {
        deleteStudioLayout( {
          peerId: id, 
          audioProducerId,
          videoProducerId,
          mediaId
        })
        setLayoutIdx( -1 )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ audioProducerId, videoProducerId, mediaId, _videoWidth, _videoHeight, state.studio.layout ])



  // when audioConsumerId and videoConsumerId got, we will render video for it.
  //
  // todo - for iOS, need to consider about autoPlay policy.
  useEffect( () => {
    let audioTrack, videoTrack

    if( _videoEl.current ) {
      const stream = new MediaStream()

      if( localStreamId ) {
        audioTrack = localStreams.get( localStreamId ).getAudioTracks()[0]
        videoTrack = localStreams.get( localStreamId ).getVideoTracks()[0]
        logger.debug( 'audioTrack:%o, videoTrack:%o', audioTrack, videoTrack )
        _videoEl.current.muted = true
      } else {
        audioTrack = audioConsumerId && roomClient.consumers && roomClient.consumers.get( audioConsumerId ) 
          ? roomClient.consumers.get( audioConsumerId ).track 
          : null
        videoTrack = videoConsumerId && roomClient.consumers && roomClient.consumers.get( videoConsumerId ) 
          ? roomClient.consumers.get( videoConsumerId ).track 
          : null
      }

      if( videoTrack ) {
        if( audioTrack ) stream.addTrack( audioTrack )
        if( videoTrack ) stream.addTrack( videoTrack )

        _videoEl.current.srcObject = stream
        _videoEl.current.playsInline = true
        _videoEl.current.onloadedmetadata = async () => {
          const videoWidth = _videoEl.current.videoWidth
          const videoHeight = _videoEl.current.videoHeight

          setVideoWidth( videoWidth )
          setVideoHeight( videoHeight )

          logger.debug('videoWidth: %d, videoHeight: %d', videoWidth, videoHeight )

          const videoEl = appData.localVideos.get( localStreamId )
          logger.debug('localVideos:%s %s %o', localStreamId, mediaId, appData.localVideos)

          if( videoEl ) {
            setIsVideo( true )
            _srcVideo.current = videoEl
            setTimeout(() => {
              videoEl.pause()
            }, 100)
          }

          await _videoEl.current.play()
          if( localStreamId ) {
            await addParticipant({ peerId: id, mediaId, displayName, audio: defaultMic, video: defaultVideo })
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ id, displayName, audioConsumerId, videoConsumerId, localStreamId, mediaId ])

  // draw boder for video which is including in studio layout.
  useEffect( () => {
    if( state.status !== 'READY' ) return

    // check if video and audio is included in studio layout
    const obj = state.studio.layout.find( item => (
      item.videoProducerId === videoProducerId && item.audioProducerId === audioProducerId 
    ))

    // when they are included, we will draw border with color, otherwise with white.
    if( obj ) {
      const layoutIdx = state.studio.layout.indexOf( obj )
      setLayoutIdx( layoutIdx )
      _wrapperEl.current.style.border = `3px solid ${videoFrameColors[ layoutIdx % videoFrameColors.length ]}`
    } else {
      setLayoutIdx( -1 )
      _wrapperEl.current.style.border = '3px solid #fff'
    }
  }, [ state.status, state.studio.layout, audioProducerId, videoProducerId ])

  // mute or unmute audio
  useEffect( () => {
    if( state.status !== 'READY' ) return

    if( localStreamId ) {
      const audioTrack = localStreams.get( localStreamId ) && localStreams.get( localStreamId ).getAudioTracks()[0]

      if( audioTrack ) {
        audioTrack.enabled = _myParticipantInfo.audio
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ state.status, _myParticipantInfo.audio, state.localMedias, localStreamId ])

  // mute or unmute video
  useEffect( () => {
    if( state.status !== 'READY' ) return

    if( localStreamId ) {
      const videoTrack = localStreams.get( localStreamId ) && localStreams.get( localStreamId ).getVideoTracks()[0]

      if( videoTrack ) {
        videoTrack.enabled = _myParticipantInfo.video
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ state.status, _myParticipantInfo.video, state.localMedias, localStreamId ])

  return (
    <div className="SourceVideo">
      <div className="videoWrapper" ref={ _wrapperEl }>
        <video ref={ _videoEl } onClick={handleClick} className={ idx === 0 ? 'mycam' : 'other' } />
        { _layoutIdx > -1 && (
        <div 
          className="layout-num" 
          style={{background: `${videoFrameColors[ _layoutIdx % videoFrameColors.length ]}`}}
          onClick={() => {
            if( _layoutIdx !== 0 ) {
              toMainInStudioLayout( _layoutIdx )
            }
          }}
        >{_layoutIdx === 0 ? "Main" : `Sub-${_layoutIdx}`}</div>
        )}
        { localStreamId && (
          <div className="close"><Button size='small' type="link" onClick={
            async () => {
              const obj = state.studio.layout.find(item => (
                item.videoProducerId === videoProducerId && item.audioProducerId === audioProducerId
              ))
              if( obj ) {
                deleteStudioLayout({
                  peerId: id,
                  audioProducerId,
                  videoProducerId,
                  mediaId
                })
              }
              if( _isVideo ) setIsVideo( false )
              await deleteParticipantByMediaId({ mediaId })
              await deleteProducer( { audioProducerId, videoProducerId } )
              await deleteLocalStream( localStreamId )
            }
          }><GiCancel/></Button></div>
        )}
        { _isVideo && (
        <div className='playback-control'>
          <Button 
            type="primary" 
            shape="circle" 
            danger 
            icon={ <IoMdSkipBackward /> }
            onClick={() => {
              _srcVideo.current.currentTime = 0
            }}
          />
          <div>&nbsp;&nbsp;&nbsp;</div>
 
          <Button 
            type="primary" 
            shape="circle" 
            danger 
            icon={ _playing ? <IoMdPause /> : <IoMdPlay /> }
            onClick={() => {
              if( _playing ) {
                _srcVideo.current.pause()
              } else {
                _srcVideo.current.play()
              }
              setPlaying( !_playing )
            }}
          />
        </div>
        )}
        <div className='mute'>
          <Button
            type='link'
            shape='circle'
            icon={!_myParticipantInfo.audio ? <BsMicMuteFill /> : <BsMicFill />}
            style={{ color: '#fff', fontSize: '1em' }}
            onClick={() => {
              updateParticipantAudio({ mediaId, audio: !_myParticipantInfo.audio })
            }}
          />
        </div>
        <div className='video-mute'>
          <Button
            type='link'
            shape='circle'
            icon={!_myParticipantInfo.video ? <BsCameraVideoOffFill /> : <BsCameraVideoFill />}
            style={{ color: '#fff', fontSize: '1em' }}
            onClick={() => {
              updateParticipantVideo({ mediaId, video: !_myParticipantInfo.video })
            }}
          />
        </div>
        <div className="meta">
          {displayName}
        </div>
      </div>
    </div>
  )
}