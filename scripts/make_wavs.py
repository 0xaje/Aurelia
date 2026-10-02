import miniaudio
import wave

for name in ["living_room", "pool_sunset"]:
    mp3 = f"{name}.mp3"
    wav = f"{name}.wav"
    decoded = miniaudio.decode_file(mp3)
    
    # If stereo, convert to mono by taking channel 0
    raw_bytes = bytes(decoded.samples)
    if decoded.nchannels == 2:
        # 16-bit = 2 bytes per sample. Pair of stereo samples is 4 bytes.
        mono_bytes = bytearray()
        for i in range(0, len(raw_bytes), 4):
            mono_bytes.extend(raw_bytes[i:i+2])
        nchannels = 1
        samples_data = bytes(mono_bytes)
    else:
        nchannels = decoded.nchannels
        samples_data = raw_bytes

    # Append 1.5s silence
    silence = b"\x00" * int(decoded.sample_rate * nchannels * 2 * 1.5)
    final_audio = samples_data + silence
    
    with wave.open(wav, "wb") as wf:
        wf.setnchannels(nchannels)
        wf.setsampwidth(2)
        wf.setframerate(decoded.sample_rate)
        wf.writeframes(final_audio)
        
    duration = len(final_audio) / (nchannels * 2 * decoded.sample_rate)
    print(f"Created {wav}: {duration:.2f}s, rate={decoded.sample_rate}Hz, channels={nchannels}")
