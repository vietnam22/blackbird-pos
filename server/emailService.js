import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { EMAIL_CONFIG } from './emailConfig.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EMAIL_RECIPIENTS_FILE = path.join(__dirname, 'data', 'email_recipients.json')

const getRecipients = () => {
  try {
    const data = JSON.parse(fs.readFileSync(EMAIL_RECIPIENTS_FILE, 'utf8'))
    return data.recipients || []
  } catch {
    return EMAIL_CONFIG.recipients || []
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_CONFIG.senderEmail,
    pass: EMAIL_CONFIG.appPassword,
  },
})

export const sendDayStartEmail = async (dayData) => {
  const { startedBy, startedAt } = dayData
  const date = new Date(startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date(startedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin: 0; padding: 20px; background: #111;">
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff; border-radius: 12px;">
        <h2 style="text-align: center; color: #4ade80;">[OPEN] ${EMAIL_CONFIG.shopName} - Day Started</h2>
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="font-size: 18px; margin: 0;">${date}</p>
          <p style="color: #888; margin: 10px 0;">Opened at <strong>${time}</strong></p>
          <p style="color: #888; margin: 0;">By: <strong>${startedBy.userName}</strong></p>
        </div>
        <p style="text-align: center; color: #4ade80; margin-top: 20px;">Have a great day!</p>
      </div>
    </body>
    </html>
  `

  try {
    const recipients = getRecipients()
    if (recipients.length === 0) {
      console.log('No email recipients configured')
      return { success: false, error: 'No recipients' }
    }
    await transporter.sendMail({
      from: `"${EMAIL_CONFIG.shopName}" <${EMAIL_CONFIG.senderEmail}>`,
      to: recipients.join(', '),
      subject: `[OPEN] ${EMAIL_CONFIG.shopName} - Day Started (${date})`,
      html,
    })
    console.log('Day start email sent!')
    return { success: true }
  } catch (error) {
    console.error('Failed to send day start email:', error)
    return { success: false, error }
  }
}

export const sendDayEndEmail = async (summary) => {
  const {
    date,
    endedBy,
    endedAt,
    soldItemsList = [],
    totalIn = 0,
    inventoryItems = [],
    inventoryTotal = 0,
    staffWages = [],
    totalWages = 0,
    rent = 0,
    totalOut = 0,
    netProfit = 0,
  } = summary

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date(endedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isProfit = netProfit >= 0
  const netColor = isProfit ? '#4ade80' : '#f87171'
  const netBg = isProfit ? '#1e3d1e' : '#3d1e1e'
  const netLabel = isProfit ? 'Net Profit' : 'Net Loss'
  const subjectIcon = isProfit ? '[PROFIT]' : '[LOSS]'

  // Build sales items HTML
  const salesHtml = soldItemsList.length === 0
    ? '<p style="color: #666;">No sales today</p>'
    : soldItemsList.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #333;">
          <span>${item.name} <span style="color: #888;">x${item.quantity}</span></span>
          <span style="color: #4ade80;">Rs. ${item.total.toLocaleString()}</span>
        </div>
      `).join('')

  // Build inventory items HTML
  const inventoryHtml = inventoryItems.length === 0
    ? '<p style="color: #666;">No inventory purchases</p>'
    : inventoryItems.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #333;">
          <span>${item.item} <span style="color: #888;">x${item.quantity}${item.unit ? ' ' + item.unit : ''}</span></span>
          <span style="color: #f87171;">Rs. ${(item.totalPrice || 0).toLocaleString()}</span>
        </div>
      `).join('')

  // Build staff wages HTML
  const staffHtml = staffWages.length === 0
    ? '<p style="color: #666;">No staff hours</p>'
    : staffWages.map(staff => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #333;">
          <span>${staff.name} <span style="color: #888;">${staff.hours.toFixed(1)}h x Rs.70</span></span>
          <span style="color: #f87171;">Rs. ${Math.round(staff.hours * 70).toLocaleString()}</span>
        </div>
      `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin: 0; padding: 20px; background: #111;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff; border-radius: 12px;">
        <h2 style="text-align: center; color: #f87171;">${EMAIL_CONFIG.shopName} - Day Ended</h2>
        
        <div style="background: #2a2a2a; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 18px; margin: 0;">${formattedDate}</p>
          <p style="color: #888; margin: 10px 0;">Closed at <strong>${time}</strong> by <strong>${endedBy.userName}</strong></p>
        </div>

        <!-- Net Result Banner -->
        <div style="background: ${netBg}; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; border: 2px solid ${netColor};">
          <p style="margin: 0; font-size: 16px;">${netLabel}</p>
          <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: ${netColor};">Rs. ${Math.abs(netProfit).toLocaleString()}</p>
        </div>

        <!-- Summary Row -->
        <table width="100%" cellpadding="0" cellspacing="10" style="margin-bottom: 20px;">
          <tr>
            <td style="background: #1e3d1e; padding: 15px; border-radius: 8px; text-align: center; width: 50%;">
              <p style="margin: 0; color: #888; font-size: 12px;">TOTAL IN</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; color: #4ade80; font-weight: bold;">Rs. ${totalIn.toLocaleString()}</p>
            </td>
            <td style="background: #3d1e1e; padding: 15px; border-radius: 8px; text-align: center; width: 50%;">
              <p style="margin: 0; color: #888; font-size: 12px;">TOTAL OUT</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; color: #f87171; font-weight: bold;">Rs. ${totalOut.toLocaleString()}</p>
            </td>
          </tr>
        </table>

        <!-- Money In Section -->
        <div style="background: #2a2a2a; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
          <div style="background: #1e3d1e; padding: 10px 15px;">
            <strong>MONEY IN - Sales</strong>
          </div>
          <div style="padding: 15px;">
            ${salesHtml}
            <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 2px solid #444; font-weight: bold;">
              <span>Total Sales</span>
              <span style="color: #4ade80;">Rs. ${totalIn.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Money Out Section -->
        <div style="background: #2a2a2a; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
          <div style="background: #3d1e1e; padding: 10px 15px;">
            <strong>MONEY OUT - Expenses</strong>
          </div>
          <div style="padding: 15px;">
            <p style="color: #888; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Inventory</p>
            ${inventoryHtml}
            <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #888; font-size: 13px;">
              <span>Inventory Subtotal</span>
              <span>Rs. ${inventoryTotal.toLocaleString()}</span>
            </div>

            <p style="color: #888; font-size: 12px; margin: 15px 0 10px 0; text-transform: uppercase;">Staff Wages</p>
            ${staffHtml}
            <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #888; font-size: 13px;">
              <span>Wages Subtotal</span>
              <span>Rs. ${totalWages.toLocaleString()}</span>
            </div>

            <p style="color: #888; font-size: 12px; margin: 15px 0 10px 0; text-transform: uppercase;">Fixed Costs</p>
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span>Daily Rent + Utilities</span>
              <span style="color: #f87171;">Rs. ${rent.toLocaleString()}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 2px solid #444; font-weight: bold;">
              <span>Total Expenses</span>
              <span style="color: #f87171;">Rs. ${totalOut.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <p style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
          Generated by ${EMAIL_CONFIG.shopName} POS System
        </p>
      </div>
    </body>
    </html>
  `

  try {
    const recipients = getRecipients()
    if (recipients.length === 0) {
      console.log('No email recipients configured')
      return { success: false, error: 'No recipients' }
    }
    await transporter.sendMail({
      from: `"${EMAIL_CONFIG.shopName}" <${EMAIL_CONFIG.senderEmail}>`,
      to: recipients.join(', '),
      subject: `${subjectIcon} ${EMAIL_CONFIG.shopName} - Daily Summary: ${isProfit ? '+' : '-'}Rs.${Math.abs(netProfit).toLocaleString()} (${formattedDate})`,
      html,
    })
    console.log('Day end email sent!')
    return { success: true }
  } catch (error) {
    console.error('Failed to send day end email:', error)
    return { success: false, error }
  }
}