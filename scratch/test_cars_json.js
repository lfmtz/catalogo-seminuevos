const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'cars.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const cars = JSON.parse(rawData);

    console.log(`\n✅ 1. Validación de Sintaxis: El archivo JSON es válido.`);
    console.log(`✅ 2. Lectura Exitosa: Se leyeron ${cars.length} autos de prueba.\n`);

    const requiredFields = [
        'id', 'marca', 'modelo', 'precio', 'duenos', 
        'motor', 'kilometraje', 'tenencias', 'verificacion', 
        'transmision', 'descripcion', 'fotos'
    ];

    let allPassed = true;

    cars.forEach((car, index) => {
        console.log(`--- Analizando Auto ${index + 1}: ${car.marca} ${car.modelo} (ID: ${car.id}) ---`);
        
        // Check fields
        const missingFields = requiredFields.filter(field => !car.hasOwnProperty(field));
        if (missingFields.length > 0) {
            console.log(`❌ Faltan campos: ${missingFields.join(', ')}`);
            allPassed = false;
        } else {
            console.log(`  - Todos los campos requeridos presentes.`);
        }

        // Check image paths
        if (Array.isArray(car.fotos)) {
            const invalidPhotos = car.fotos.filter(foto => !foto.startsWith(`assets/images/${car.id}/`));
            if (invalidPhotos.length > 0) {
                console.log(`  ❌ Fotos con ruta inválida:`, invalidPhotos);
                allPassed = false;
            } else {
                console.log(`  - Todas las fotos (${car.fotos.length}) apuntan correctamente a assets/images/${car.id}/`);
            }
        } else {
            console.log(`  ❌ El campo 'fotos' no es un arreglo.`);
            allPassed = false;
        }
    });

    if (allPassed) {
        console.log(`\n🎉 ¡TEST PASÓ CON ÉXITO! Todos los autos cumplen al 100% con los requerimientos.\n`);
    } else {
        console.log(`\n❌ El test falló. Por favor revisa los errores listados arriba.\n`);
        process.exit(1);
    }

} catch (error) {
    console.error("❌ Error de lectura/validación:", error.message);
    process.exit(1);
}
