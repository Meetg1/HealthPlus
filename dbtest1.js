const connectDB = require('./config/db')

// const specialType = require('./models/specialType')
const Admin = require('./models/Admin')
const Speciality = require('./models/Speciality')
// const specialType = require('./models/specialType')

connectDB()

const specialization = [
    {
        specId: 1,
        specialType: 'Anatomical Pathologist',
    },
    {
        specId: 2,
        specialType: 'Anesthesiologist',
    },
    {
        specId: 3,
        specialType: 'Cardiologist',
    },
    {
        specId: 4,
        specialType: 'Cardiovascular/Thoracic Surgeon',
    },
    {
        specId: 5,
        specialType: 'Clinical Immunologist/Allergy',
    },
    {
        specId: 6,
        specialType: 'Critical Care Medicine',
    },
    {
        specId: 7,
        specialType: 'Diagnostic Radiologist',
    },
    {
        specId: 8,
        specialType: 'Emergency Medicine',
    },
    {
        specId: 9,
        specialType: 'Endocrinologist and Metabolism',
    },
]

specialization.forEach((spec) => {
    Speciality.create(spec, function (err, newCreation) {
        if (err) {
            console.log(err)
        } else {
            console.log(newCreation)
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
