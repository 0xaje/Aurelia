import asyncio
import edge_tts
import miniaudio
import wave

async def create_speech_wav(text: str, filename: str):
    mp3_file = filename.replace(".wav", ".mp3")
    communicate = edge_tts.Communicate(text, voice="en-US-EmmaMultilingualNeural")
    await communicate.save(mp3_file)
    
    decoded = miniaudio.decode_file(mp3_file)
    
    # Append 1.5s of silence (zeros in 16-bit PCM) so streaming VAD finalizes turn
    silence_bytes = b"\x00" * int(decoded.sample_rate * decoded.nchannels * 2 * 1.5)
    full_audio = bytes(decoded.samples) + silence_bytes
    
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(decoded.nchannels)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(decoded.sample_rate)
        wf.writeframes(full_audio)
    
    duration = (len(full_audio) / (decoded.nchannels * 2)) / decoded.sample_rate
    print(f"Generated {filename}: rate={decoded.sample_rate}Hz, channels={decoded.nchannels}, duration={duration:.2f}s")

async def main():
    await create_speech_wav("Show me the living room.", "speech_living_room.wav")
    await create_speech_wav("Show me the pool at sunset.", "speech_pool_sunset.wav")

if __name__ == "__main__":
    asyncio.run(main())
