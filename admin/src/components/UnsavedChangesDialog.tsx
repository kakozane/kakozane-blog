import { Modal } from 'antd'
import type { Blocker } from 'react-router'

export default function UnsavedChangesDialog({ blocker, saving, onDiscard }: { blocker: Blocker; saving: boolean; onDiscard?: () => void }) {
  return <Modal
    title="可能有未保存的修改"
    open={blocker.state === 'blocked'}
    okText="放弃修改"
    okButtonProps={{ danger: true, disabled: saving }}
    cancelText="继续编辑"
    closable={false}
    maskClosable={false}
    onCancel={() => { if (blocker.state === 'blocked') blocker.reset() }}
    onOk={() => { if (blocker.state === 'blocked') { onDiscard?.(); blocker.proceed() } }}
  >离开后，尚未保存的内容会丢失。</Modal>
}
