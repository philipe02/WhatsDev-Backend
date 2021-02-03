const Message = require('../models/Messages')
const User = require('../models/Users')
const crypto = require('crypto')
const moment = require('moment')
const { compare } = require('../../utils')

class MessageController {
  async sendMessage(req, res) {
    const { text, user_send, user_destination } = req.body

    if (user_destination === user_send) {
      return res.status(400).json({ message: "Você não pode enviar mensagem para si mesmo!" })
    }

    const message = await Message.create({
      text: text,
      user_id: user_send,
      user_destination: user_destination
    })

    const formattedData = {
      id: message.id,
      text: message.text,
      user_id: message.user_id
    }

    const receiver = crypto.createHash('md5').update(`${user_destination}`).digest('hex')

    req.io.emit(`${receiver}`, formattedData)

    return res.status(200).json(formattedData)
  }
  async listAllMessages(req, res) {
    const { userId, myId } = req.params

    const messageReceiver = await Message.findAll({
      raw: true,
      nest: true,
      attributes: ['id', 'text', 'createdAt'],
      include: [
        {
          model: User, as: 'user',
          attributes: ['name', 'id']
        }
      ],
      where: {
        user_id: userId,
        user_destination: myId
      }
    })
    const messagesSend = await Message.findAll({
      raw: true,
      nest: true,
      attributes: ['id', 'text', 'createdAt'],
      include: [
        {
          model: User, as: 'user',
          attributes: ['name', 'id']
        }
      ],
      where: {
        user_id: myId,
        user_destination: userId
      }
    })

    const messages = [...messageReceiver, ...messagesSend]

    if (messages.length === 0) {
      return res.status(404).json({ message: "Sem mensagens para carregar!" })
    }

    const formattedData = []

    for (const item of messages) {
      formattedData.push({
        id: item.id,
        text: item.text,
        hour: moment(item.createdAt).format('hh:ss'),
        user: item.user.name,
        userId: item.user.id
      })
    }

    formattedData.sort(compare)
  }
}

module.exports = new MessageController()