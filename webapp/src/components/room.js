import { useEffect, useState } from 'react'
import { Alert, Button, Col, Collapse, Divider, Row } from 'antd'

import Studio from './studio'
import StudioPatterns from './studio-patterns'
import Sources from './sources'

import { useAppContext } from '../libs/reducer'
import { apiEndpoint } from '../libs/url-factory'
import Logger from '../libs/logger'

import './room.css'

const { Panel } = Collapse

const logger = new Logger('Room')
const showDebug = process.env.NODE_ENV === 'development'

export default function Room( props ) {
  const { appData, state, createRoomClient, joinRoom, createProducer, close } = useAppContext()
  const [ _guestId, setGuestId ] = useState('')
  const [ _errMessage, setErrMessage ] = useState('')
  const { displayName, stream, roomId } = props
  
  useEffect( () => {
    const peerId = createRoomClient({ displayName, roomId })

    logger.debug("client created:%o", appData.roomClient )

    joinRoom()
      .then( () => {
        createProducer({ peerId, displayName, stream })
      } )
      .catch( err => setErrMessage( err.message ))

    fetch( `${apiEndpoint}/guestId/${roomId}` )
      .then( res => res.text() )
      .then( guestId => setGuestId( guestId ))
      .catch( err => setErrMessage( err.message ))

    return async function cleanup() {
      await close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ displayName, roomId ])

  return (
    <div className='Room'>
      { _errMessage !== '' && (
        <Alert type="error" closable showIcon message={ _errMessage } />
      )}
      <div className='studio-container'>
        <Studio style={{ maxHeight: "70vh"}} />
      </div>
      <div className='container' style={{ textAlign: "center" }}>
        <Row gutter={16}>
          <Col offset={3} span={18} style={{ textAlign: "center" }}>
            <StudioPatterns />
          </Col>
          <Col span={3} style={{ textAlign: "right" }}>
            <Button type="link"><a href={`/viewer/${roomId}`} rel="noreferrer" target="_blank">Viewer</a></Button><br />
            <Button type="link"><a href={`/guest/${_guestId}`} rel="noreferrer" target="_blank">Guest link</a></Button>
          </Col>
        </Row>
      </div>
      <Divider />
      <div className='container'>
        <Sources />
      </div>
      
      { showDebug && (
      <div className='debug'>
        <Collapse bordered={true} style={{ background: "rgba( 255, 255, 255, 0.5 )", fontSize: "0.75em" }}>
          <Panel header="debug window">
              <pre style={{ background: "rgba( 255, 255, 255, 0.5 )"}}>
                {JSON.stringify(state, null, 2)}
              </pre>
          </Panel>
        </Collapse>
     </div>
      )}
    </div>
  )
}