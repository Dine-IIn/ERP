use std::fs;
use minisign_verify::{PublicKey, Signature};

fn main() {
    println!("=== RUST SIGNATURE VERIFICATION ===");
    
    // 1. Load public key
    let pub_key_str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEIzM0MyMTI3NUY0REVEM0QKUldROTdVMWZKeUU4czkxcFBrUSt1cTRQSlZNOFljOEQ5dTE5WW5yaGlBcVgxQW8rR1VZUWxsVXkK";
    let public_key = PublicKey::from_base64(pub_key_str).expect("Failed to parse public key");
    println!("Parsed Public Key successfully.");

    // 2. Load signature
    let sig_path = "../../central_services/updates/v0.0.2/ERP_0.0.2_x64_en-US.msi.sig";
    let sig_content = fs::read_to_string(sig_path).expect("Failed to read signature file");
    let signature = Signature::from_base64(&sig_content).expect("Failed to parse signature");
    println!("Parsed Signature successfully.");

    // 3. Load file data
    let msi_path = "../../central_services/updates/v0.0.2/ERP_0.0.2_x64_en-US.msi";
    let msi_data = fs::read(msi_path).expect("Failed to read MSI file");
    println!("Loaded MSI file: {} bytes.", msi_data.len());

    // 4. Verify
    match public_key.verify(&msi_data, &signature, true) {
        Ok(_) => println!("✅ SUCCESS: Signature is VALID!"),
        Err(err) => println!("❌ ERROR: Signature verification failed: {:?}", err),
    }
}
