const fs = require('fs')
const https = require('https')
const http = require('http')
const path = require('path')
const Hashids = require( 'hashids')
const express = require('express')
const cors = require('cors')
const Logger = require('../logger')

const config = require('../../config')

const hashids = new Hashids()
const logger = new Logger('ApiServer')

/**
 * @class
 */
class ApiServer {
  /**
   * @type {Map<Object>}
   */
  _rooms = null

  /**
   * @type {StudioDB}
   */
  _studioDB = null

  /**
   * @type {Express}
   */
  _expressApp = null

  /**
   * @type {http.Server}
   */
  _httpServer = null

  /**
   * @type {boolean}
   */
  _useTls = false

  /**
   * 
   * @constructor
   * @param {object} props 
   * @param {Map<Object>} props.rooms
   * @param {StudioDB} props.studioDB
   * @param {boolean}  props.useTls
   */
  constructor( props ) {
    this._rooms = props.rooms
    this._studioDB = props.studioDB
    this._useTls = props.useTls
  }

  /**
   * start
   * 
   * @method ApiServer#start
   * @returns {http.Server} 
   */
  async start() {
    this._createExpressApp()
    await this._runApiServer()
  }

  /**
   * @type {http.Server}
   */
  get httpServer() {
    return this._httpServer
  }

  _createExpressApp = () => {
    this._expressApp = express()
    this._expressApp.use( express.json() )
    this._expressApp.use( cors() )

    this._expressApp.use( express.static( path.join( __dirname, "..", "..", "webapp", "build") ))
    this._expressApp.use((req, res, next) => {
      if( req.url.includes("/virtual-studio") || req.url.includes("/viewer") || req.url.includes("/guest-room") ) {
        res.sendFile( path.join( __dirname, "..", "..", "webapp", "build", "index.html" ) )
      } else {
        next()
      }
    })

    this._expressApp.param( 'roomId', ( req, res, next, roomId ) => {
      req.roomId = roomId
      req.room = this._rooms.get( roomId )
      next()
    })

    // generate random name for create room
    this._expressApp.get('/api/studio', ( req, res ) => {
      const name = hashids.encode(Date.now())
      logger.info('name:%s', name)
      res.json({ name })
    })

    this._expressApp.get('/api/studio/:roomId', async ( req, res ) => {
      // check auth is needed for req.roomId
      const roomId = await this._studioDB.findOrSetRoomName( req.params.roomId )
      const isAuthNeeded = await this._studioDB.isPasscodeExist( roomId )

      if( isAuthNeeded ) {
        res.status( 401 ).send('unauthenticated')
      } else {
        res.status( 200 ).send('ok')
      }
    })

    this._expressApp.post('/api/studio/:roomId', async ( req, res ) => {
      const { passcode } = req.body
      const result = await this._studioDB.challengePasscode({ roomName: req.roomId, passcode })

      if( result ) {
        res.status(200).send('ok')
      } else {
        res.status(403).send('forbidden')
      }
    })

    /////////////////////////////////////////////////
    // APIs for Covers ( no update)
    /////////////////////////////////////////////////

    // getter - GET /api/studio/:roomId/covers
    this._expressApp.get('/api/studio/:roomId/covers', async ( req, res ) => {
      const roomName = req.params.roomId

      const result = await this._studioDB.getCoverUrls( roomName )

      if( result ) {
        res.status( 200 ).send( result )
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    // setter - POST /api/studio/:roomId/covers
    this._expressApp.post('/api/studio/:roomId/covers', async ( req, res ) => {
      const roomName = req.params.roomId
      const { url } = req.body
      logger.info('POST covers - %s, %s', roomName, url)

      if( !roomName || !url ) {
        res.status( 400 ).send('Both roomName and url MUST be specified.')
      }

      const result = await this._studioDB.setCoverUrl({ roomName, url })

      if( result ) {
        res.status( 200 ).send( result )

        const room = this._rooms.get( roomName )
        if( room ) {
          const coverUrls = await this._studioDB.getCoverUrls( roomName )
          room.broadcast( 'updatedCoverUrls', coverUrls )
        }
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    // delete - DELETE /api/studio/:roomId/covers
    this._expressApp.delete('/api/studio/:roomId/covers', async ( req, res ) => {
      const roomName = req.params.roomId
      const { id } = req.body
      logger.info('DELETE covers - %s, %s', roomName, id)

      if( !roomName || !id ) {
        res.status( 400 ).send('Both roomName and url MUST be specified.')
      }

      const result = await this._studioDB.deleteCoverUrl({ roomName, id })

      if( result ) {
        res.status( 200 ).send( result )

        const room = this._rooms.get( roomName )
        if( room ) {
          const coverUrls = await this._studioDB.getCoverUrls( roomName )
          room.broadcast( 'updatedCoverUrls', coverUrls )
        }
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    /////////////////////////////////////////////////
    // APIs for Backgrounds ( no update)
    /////////////////////////////////////////////////

    // getter - GET /api/studio/:roomId/backgrounds
    this._expressApp.get('/api/studio/:roomId/backgrounds', async ( req, res ) => {
      const roomName = req.params.roomId

      const result = await this._studioDB.getBackgroundUrls( roomName )

      if( result ) {
        res.status( 200 ).send( result )
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    // setter - POST /api/studio/:roomId/covers
    this._expressApp.post('/api/studio/:roomId/backgrounds', async ( req, res ) => {
      const roomName = req.params.roomId
      const { url } = req.body
      logger.info('POST backgrounds - %s, %s', roomName, url)

      if( !roomName || !url ) {
        res.status( 400 ).send('Both roomName and url MUST be specified.')
      }

      const result = await this._studioDB.setBackgroundUrl({ roomName, url })

      if( result ) {
        res.status( 200 ).send( result )

        const room = this._rooms.get( roomName )
        if( room ) {
          const backgroundUrls = await this._studioDB.getBackgroundUrls( roomName )
          room.broadcast( 'updatedBackgroundUrls', backgroundUrls )
        }
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    // delete - DELETE /api/studio/:roomId/covers
    this._expressApp.delete('/api/studio/:roomId/backgrounds', async ( req, res ) => {
      const roomName = req.params.roomId
      const { id } = req.body
      logger.info('DELETE backgrounds - %s, %s', roomName, id)

      if( !roomName || !id ) {
        res.status( 400 ).send('Both roomName and url MUST be specified.')
      }

      const result = await this._studioDB.deleteBackgroundUrl({ roomName, id })

      if( result ) {
        res.status( 200 ).send( result )

        const room = this._rooms.get( roomName )
        if( room ) {
          const backgroundUrls = await this._studioDB.getBackgroundUrls( roomName )
          room.broadcast( 'updatedBackgroundUrls', backgroundUrls )
        }
      } else {
        res.status( 404 ).send('Not found')
      }
    })

    ///////////////////////////////////////////////////////////////
    // APIs for studio
    ///////////////////////////////////////////////////////////////
    this._expressApp.put('/api/studio/:roomId', async ( req, res ) => {
      try {
        const { passcode } = req.body
        await this._studioDB.setPasscode({ roomName: req.roomId, passcode })

        res.status(201).send('accepted')
      } catch( err ) {
        res.status( err.status || 500 ).send( err.message )
      }
    })

    this._expressApp.post('/api/reaction/:roomId', ( req, res ) => {
      req.room.addReaction(0)
      res.status(201).send('accepted')
    })

    this._expressApp.get('/api/reaction/:roomId', ( req, res ) => {
      const numReaction = req.room.numReaction
      res.status(200).json(numReaction)
    })



    this._expressApp.get('/api/guestId/:roomId', ( req, res ) => {
      const guestId = getGuestId( req.roomId )
      res.status(200).send( guestId )
    })

    this._expressApp.get('/api/roomId/:guestId', ( req, res ) => {
      const guestId = req.params.guestId
      const roomId = getRoomId( guestId )
      res.status(200).send( roomId )
    })

    this._expressApp.get('/rooms/:roomId', ( req, res ) => {
      if( req.room ) {
        const data = req.room.getRouterRtpCapabilities()
        res.status( 200 ).json( data )
      } else {
        const error = new Error( `room with id "${roomId}" not found` )
        error.status = 404

        throw error
      }
    })


    this._expressApp.use( ( error, req, res, next ) => {
      if( error ) {
        logger.warn('Express app %s', String( error ))
        error.status = error.status || ( error.name === 'TypeError' ? 400 : 500 ) 
        res.statusMessage = error.message
        res.status( error.status ).send( String( error ) )
      } else {
        next()
      }
    })
  }

  _runApiServer = async () => {
    if( this._useTls ) {
      const tls = {
        cert: fs.readFileSync( config.api.tls.cert ),
        key : fs.readFileSync( config.api.tls.key )
      }

      this._httpServer = https.createServer( tls, this._expressApp )
    } else {
      this._httpServer = http.createServer( this._expressApp )
    }

    await new Promise( (resolve) => {
      const port = Number( config.api.listenPort )
      this._httpServer.listen( port, config.api.listenIp, () => {
        logger.info( 'API server running on port - %d', port )
        resolve()
      } )
    })
  }
}

module.exports = ApiServer