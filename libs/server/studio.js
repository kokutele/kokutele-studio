const  Logger = require('../logger')
const config = require('../../config')

const logger = new Logger('studio')

const layoutPatterns = [
  { 
    id: 0, 
    label: "main only",
    type: 'horizontal'
  },
  { 
    id: 1, 
    label: "tile",
    type: 'horizontal'
  },
  { 
    id: 2, 
    label: "large and small",
    type: 'horizontal'
  },
  { 
    id: 3, 
    label: "p-in-p",
    type: 'horizontal'
  },
  { 
    id: 4, 
    label: "vertical-main",
    type: 'vertical'
  },
  { 
    id: 5, 
    label: "vertical-tile",
    type: 'vertical'
  },
  { 
    id: 6, 
    label: "vertical-p-in-p",
    type: 'vertical'
  },
]

/**
 * @class
 */
class Studio {
  /**
   * 
   * @constructor
   * @param {object} props 
   * @param {number} props.width
   * @param {number} props.height
   */
  constructor( props ) {
    this._height = props.height
    this._width  = props.width 
    this._coverUrl = ''
    this._backgroundUrl = ''
    this._patternId = layoutPatterns[0].id

    this._layout = []
    this._participants = []
  }

  /**
   * canvas height
   * 
   * @type {number}
   * 
   */
  get height() {
    return this._height
  }

  /**
   * canvas width
   * 
   * @type {number}
   * 
   */
  get width() {
    return this._width
  }

  /**
   * current layout
   * 
   * @type {object}
   */
  get layout() {
    return this._layout
  }

  /**
   * participants
   * 
   * @type {Array<Object>}
   */
  get participants() {
    return this._participants
  }

  /**
   * current patternId
   * 
   * @type {number}
   * 
   */
  get patternId() {
    return this._patternId
  }

  set patternId( id ) {
    this._patternId = id
  }

  /**
   * patterns
   * 
   * @type {Array<Object>}
   */
  get patterns() {
    return layoutPatterns
  }

  /**
   * current cover image url
   * 
   * @type {string}
   */
  get coverUrl() {
    return this._coverUrl
  }

  set coverUrl( url ) {
    this._coverUrl = url
  }

  /**
   * current background image url
   * 
   * @type {string}
   * 
   */
  get backgroundUrl() {
    return this._backgroundUrl
  }

  set backgroundUrl( url ) {
    return this._backgroundUrl = url
  }

  /**
   * start. here, nothing done
   * 
   * @method Studio#start
   * 
   */
  start() {
    // nothing
  }

  /**
   * add media to layout
   * 
   * @method Studio#addMedia
   * @param {object} props 
   * @param {string} props.peerId
   * @param {number} props.videoHeight
   * @param {number} props.videoWidth
   * @param {string} props.mediaId
   * @param {string} props.audioProducerId
   * @param {string} props.videoProducerId
   * 
   */
  async addMedia({ peerId, videoHeight, videoWidth, mediaId, audioProducerId, videoProducerId }) {
    // check if media is already exist
    let isExist = !!this._layout.find( item => (
      item.peerId === peerId && item.audioProducerId === audioProducerId && item.videoProducerId === videoProducerId && item.mediaId === mediaId
    ))
        
    // if media is not exist in current layout, add it.
    if( !isExist ) {
      this._layout = [ ...this._layout, { peerId, audioProducerId, videoProducerId, videoWidth, videoHeight, mediaId }]

      this._calcLayout()
    }
  }

  /**
   * delete media from layout
   * 
   * @method Studio#deleteMedia
   * @param {object} props 
   * @param {string} props.peerId
   * @param {string} props.mediaId
   * @param {string} props.audioProducerId
   * @param {string} props.videoProducerId
   * 
   */
  deleteMedia({ peerId, mediaId, audioProducerId, videoProducerId }) {
    // delete media from current layout
    this._layout = this._layout.filter( item => ( 
      !( item.peerId === peerId && item.audioProducerId === audioProducerId && item.videoProducerId === videoProducerId && item.mediaId === mediaId )
    ))
    this._calcLayout()
  }

  /**
   * move the media indicated by layoutIdx to main media
   * 
   * @method Studio#toMain
   * @param {number} layoutIdx 
   * 
   */
  toMain( layoutIdx ) {
    this._layout = [ this._layout[layoutIdx], ...this._layout.filter( ( item, idx ) => idx !== layoutIdx ) ]
    this._calcLayout()
  }

  /**
   * delete the peer indicated by peerId from current layout
   * 
   * @method Studio#deletePeer
   * @param {string} peerId 
   * 
   */
  deletePeer( peerId ) {
    this._layout = this._layout.filter( item => item.peerId !== peerId )
    this._calcLayout()
  }

  /**
   * add participant to this studio.
   * 
   * @method Studio#addParticipant
   * @param {object} props 
   * @param {string} props.peerId 
   * @param {string} props.mediaId
   * @param {string} props.displayName
   * @param {boolean} props.audio
   * @param {boolean} props.video
   * 
   */
  addParticipant( { peerId, mediaId, displayName, audio, video } ) {
    this._participants = [ ...this._participants, { peerId, mediaId, displayName, audio, video }]
  }

  /**
   * update audio status of the participant indicated by mediaId
   * 
   * @method Studio#updateParticipantAudio
   * @param {string} mediaId
   * @param {boolean} audio
   * 
   */
  updateParticipantAudio( mediaId, audio )  {
    this._participants = this._participants.map( item => (
      item.mediaId === mediaId ? { ...item, audio } : item
    ))
  }

  /**
   * update video status of the participant indicated by mediaId
   * 
   * @method Studio#updateParticipantVideo
   * @param {string} mediaId
   * @param {boolean} video
   * 
   */
  updateParticipantVideo( mediaId, video )  {
    this._participants = this._participants.map( item => (
      item.mediaId === mediaId ? { ...item, video } : item
    ))
  }

  /**
   * delete participants indicated by peerId
   * 
   * @method Studio#deleteParticipantsByPeerId
   * @param {string} peerId 
   */
  deleteParticipantsByPeerId( peerId ) {
    this._participants = this._participants.filter( item => item.peerId !== peerId )
  }

  /**
   * delete the participant indicated by mediaId
   * 
   * @method Studio#deleteParticipantByMediaId
   * @param {string} mediaId 
   */
  deleteParticipantByMediaId( mediaId ) {
    this._participants = this._participants.filter( item => item.mediaId !== mediaId )
  }

  /**
   * calcurate layout position of each media
   * 
   * @method Studio#calcLayout
   * 
   */
  calcLayout() {
    this._calcLayout()
  }

  /**
   * select each layout calcuration method depending on patternId
   * 
   * @private
   * @method Studio#_calcLayout
   * @returns {Null}
   */
  _calcLayout() {
    // todo - test code
    if( this._layout.length === 0 ) return 

    if( this._patternId === 0 ) {
      this._calcMainOnlyLayout()
    } else if( this._patternId === 1 ) {
      this._calcTileLayout()
    } else if( this._patternId === 2 ) {
      this._calcLargeAndSmallLayout()
    } else if( this._patternId === 3 ) {
      this._calcPinPLayout()
    } else if( this._patternId === 4 ) {
      this._calcVerticalMain()
    } else if( this._patternId === 5 ) {
      this._calcVerticalTile()
    } else if( this._patternId === 6 ) {
      this._calcVerticalPinP()
    }

    logger.info( '"_calcLayout()" - layout:%o', this._layout )
  }

  /**
   * calcurate main only layout
   * 
   * @private
   * @method Studio#_calcMainOnlyLayout
   * 
   */
  _calcMainOnlyLayout() {
    for( let i = 0; i < this._layout.length; i++ ) {
      const height = i === 0 ? this._height : 0
      const width  = i === 0 ? this._width : 0 // Math.floor( this._layout[0].videoWidth * height / this._layout[0].videoHeight ) : 0
      const posX = 0 // i === 0 ? Math.floor( ( this._width - width ) / 2 ) : 0
      const posY = 0

      this._layout[i] = { ...this._layout[i], posX, posY, width, height }
    }
  }

  /**
   * calcurate tile layout
   * 
   * @private
   * @method Studio#_calcTileLayout
   * 
   */
  _calcTileLayout() {
    const numCol = Math.ceil( Math.sqrt( this._layout.length ) ) 
    const numRow = ( this._layout.length > ( numCol * ( numCol - 1 ) ) ) ? numCol : numCol - 1

    const _width = Math.floor( this._width / numCol )
    const _height = Math.floor( this._height / numCol )

    const paddingY = numRow < numCol ? Math.floor( _height / 2 ) : 0

    for( let y = 0; y < numRow; y++ ) {
      for( let x = 0; x < numCol; x++ ) {
        const idx = x + y * numCol

        if( idx < this._layout.length ) {
          const height = _height
          const width = _width

          const posX = x * _width
          const posY = y * _height + paddingY

          this._layout[idx] = { ...this._layout[idx], posX, posY, width, height }
        }
      }
    }
  }

  /**
   * calcurate large and small layout
   * 
   * @private
   * @method Studio#_calcLargeAndSmallLayout
   * 
   */
  _calcLargeAndSmallLayout() {
    for( let i = 0; i < this._layout.length; i++ ) {
      let width, height
      const numSub = 6

      if( i > numSub ) {
        width = 0; height = 0
      } else {
        height = i === 0 ? Math.floor( this._height * ( numSub - 1 ) / numSub ) : Math.floor( this._height * 1 / numSub )
        width  = Math.floor( this._width * height / this._height )
      }
      const posX = i === 0 ? 0 : Math.floor( this._width * ( numSub - 1 ) / numSub )
      const posY = i === 0 ? Math.floor( ( this._height - height ) / 2 ) : ( i - 1 ) * height

      this._layout[i] = { ...this._layout[i], posX, posY, width, height }
    }
  }

  /**
   * calcurate PinP layout
   * 
   * @private
   * @method Studio#_calcPinPLayout
   * 
   */
  _calcPinPLayout() {
    for( let i = 0; i < this._layout.length; i++ ) {
      let width, height
      if( i > 5 ) {
        width = 0; height = 0;
      } else {
        height = i === 0 ? this._height : Math.floor( this._height * 1 / 5 * 0.9 )
        width  = Math.floor( this._width * height / this._height )
      }
      const posX = i === 0 ? 
        0 : 
        Math.floor( this._width / 5 ) * ( i - 1 ) + Math.floor((( this._width / 5 ) - width ) / 2 )
      const posY = i === 0 ? 0 : this._height - height - Math.floor( this._height / 25 )

      this._layout[i] = { ...this._layout[i], posX, posY, width, height }
    }
  }

  /**
   * calcurate vertical main layout
   * 
   * @private
   * @method Studio#_calcVerticalMain
   * 
   */
  _calcVerticalMain() {
    for( let i = 0; i < this._layout.length; i++ ) {
      const height = i === 0 ? this._height : 0
      const width  = i === 0 ? Math.floor( this._height * 9 / 16 ) : 0 // Math.floor( this._layout[0].videoWidth * height / this._layout[0].videoHeight ) : 0
      const posX = Math.floor( ( this._width - width ) / 2 ) // i === 0 ? Math.floor( ( this._width - width ) / 2 ) : 0
      const posY = 0

      this._layout[i] = { ...this._layout[i], posX, posY, width, height }
    }
  }

  /**
   * calcurate vertical tile layout
   * 
   * @private
   * @method Studio#_calcVerticalTile
   * 
   */
  _calcVerticalTile() {
    const numCol = Math.ceil( Math.sqrt( this._layout.length ) ) 
    const numRow = ( this._layout.length > ( numCol * ( numCol - 1 ) ) ) ? numCol : numCol - 1
    const _width = Math.floor( this._height * 9 / 16 )

    const width = Math.floor( _width / numCol )
    const height = Math.floor( this._height / numCol )

    const paddingX = Math.floor( ( this._width - _width ) / 2 )
    const paddingY = numRow < numCol ? Math.floor( height / 2 ) : 0

    for( let y = 0; y < numRow; y++ ) {
      for( let x = 0; x < numCol; x++ ) {
        const idx = x + y * numCol

        if( idx < this._layout.length ) {
          const posX = x * width + paddingX
          const posY = y * height + paddingY

          this._layout[idx] = { ...this._layout[idx], posX, posY, width, height }
        }
      }
    }
  }

  /**
   * calcurate vertical pinp layout
   * 
   * @private
   * @method Studio#_calcVerticalPinP
   * 
   */
  _calcVerticalPinP() {
    for( let i = 0; i < this._layout.length; i++ ) {
      let width, height
      if( i > 5 ) {
        width = 0; height = 0;
      } else {
        height = i === 0 ? this._height : Math.floor( this._height * 1 / 5 * 0.9 )
        width  = Math.floor( height * this._height / this._width )
      }
      const offsetX = 25, offsetY = 125
      const padX = Math.floor( ( this._width - this._height * this._height / this._width ) / 2 ) 
      const posXs = [
        padX, 
        padX + offsetX, 
        padX + this._height * this._height / this._width - width - offsetX,
        padX + offsetX, 
        padX + this._height * this._height / this._width - width - offsetX,
      ]
      const posX = posXs[i]

      const posYs = [
        0,
        offsetY,
        offsetY,
        height + offsetY + 15,
        height + offsetY + 15,
      ]
      const posY = posYs[i]

      this._layout[i] = { ...this._layout[i], posX, posY, width, height }
    }
  }
}

module.exports = Studio