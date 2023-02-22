const connectDB = require('./config/db')

const AppointmentSlot = require('./models/AppointmentSlot')
const Admin = require('./models/Admin')

connectDB()

const slots = [
   {
      slotId: 1,
      slotTime: '08:00 - 08:30',
   },
   {
      slotId: 2,
      slotTime: '08:30 - 09:00',
   },
   {
      slotId: 3,
      slotTime: '09.00 - 09:30',
   },
   {
      slotId: 4,
      slotTime: '09.30 - 10:00',
   },
   {
      slotId: 5,
      slotTime: '10:00 - 10:30',
   },
   {
      slotId: 6,
      slotTime: '10:30 - 11:00',
   },
   {
      slotId: 7,
      slotTime: '11:00 - 11:30',
   },
   {
      slotId: 8,
      slotTime: '11:30 - 12:00',
   },
   {
      slotId: 9,
      slotTime: '12:00 - 12:30',
   },
   {
      slotId: 10,
      slotTime: '12:30 - 13:00',
   },
   {
      slotId: 11,
      slotTime: '13:00 - 13:30',
   },
   {
      slotId: 12,
      slotTime: '13:30 - 14.00',
   },
   {
      slotId: 13,
      slotTime: '14:00 - 14:30',
   },
   {
      slotId: 14,
      slotTime: '14:30 - 15:00',
   },
   {
      slotId: 15,
      slotTime: '15:00 - 15:30',
   },
   {
      slotId: 16,
      slotTime: '15:30 - 16:00',
   },
   {
      slotId: 17,
      slotTime: '16:00 - 16:30',
   },
   {
      slotId: 18,
      slotTime: '16:30 - 17:00',
   },
   {
      slotId: 19,
      slotTime: '17:00 - 17:30',
   },
   {
      slotId: 20,
      slotTime: '17:30 - 18:00',
   },
   {
      slotId: 21,
      slotTime: '18:30 - 19:00',
   },
   {
      slotId: 22,
      slotTime: '19:00 - 19.30',
   },
   {
      slotId: 23,
      slotTime: '19.30 - 20:00',
   },
]

slots.forEach((slot) => {
   AppointmentSlot.create(slot, function (err, newlyCreated) {
      if (err) {
         console.log(err)
      } else {
         console.log(newlyCreated)
         //redirect back to items page
         // res.redirect("/items");
      }
   })
})

// const admin = {
//    username: 'meet',
//    password: '11',
// }

// Admin.create(admin, function (err, newlyCreated) {
//    if (err) {
//       console.log(err)
//    } else {
//       console.log(newlyCreated)
//       //redirect back to items page
//       // res.redirect("/items");
//    }
// })
