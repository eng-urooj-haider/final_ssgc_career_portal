import prisma from "../app/lib/db"

async function seed(){
    await prisma.user.createMany({
        data:[
            {email:"uroojtest.com" , password:'mncdnsdn',role:"admin"},
            {email:"urooj.com" , password:'mncdnsdn',role:"admin"}
        ]
    })
}
seed().then(()=>prisma.$disconnect())