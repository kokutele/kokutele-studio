import { useCallback, useState } from 'react'
import { Alert, Button } from 'antd'
import pokemon from 'pokemon'

import Studio from './studio'
import Sources from './sources'

import { useAppContext } from '../libs/reducer'
import Logger from '../libs/logger'


import './room.css'

const logger = new Logger('Room')

export default function Room( props ) {
  const { appData, state, createRoomClient, joinRoom } = useAppContext()
  const [ _errMessage, setErrMessage ] = useState('')
  
  const handleStart = useCallback( async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      createRoomClient({ stream ,displayName: pokemon.random() })

      logger.debug("client created:%o", appData.roomClient )

      await joinRoom()
    } catch( err ) {
      setErrMessage( err.message )
    }
  }, [ appData.roomClient, createRoomClient, joinRoom ])

  return (
    <div className='Room'>
      { _errMessage !== '' && (
        <Alert type="error" closable showIcon message={ _errMessage } />
      )}
      <div>
        displayName: { state.displayName }, peerId: { state.peerId }, status: { state.status }
      </div>
      { state.status === 'IDLE' && (
        <div>
          <Button type="primary" onClick={ handleStart }>start</Button>
        </div>
      )}
      <Studio />
      <Sources />
      
      <div className='debug'>
        <pre>
          {JSON.stringify( state, null, 2 )}
        </pre>
      </div>
    </div>
  )
}