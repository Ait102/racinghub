import type { CircuitLayout } from '../../../data/circuits';

const CC_BY_SA = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  changes: 'контур переведён в SVG',
};

// Only the race centerlines are traced. Each outline retains its source license.
export const berlin: CircuitLayout = {
  eras: [[2026, 2026]],
  lengthKm: 2.374,
  turns: 15,
  direction: 'anticlockwise',
  d: `M245 216 C218 215 191 216 168 209 L92 186 Q84 183 76 185 L46 192
    Q35 195 41 205 L87 249 Q99 261 110 252 L127 237 Q139 226 150 237
    C182 267 214 282 249 278 C279 275 348 258 371 254 Q377 253 379 259
    L382 272 Q383 277 378 278 L311 290 Q279 296 248 291 L159 278
    C147 275 143 286 151 291 L197 307 Q220 315 240 313
    C288 312 333 308 351 305 Q360 303 368 299 L452 256 Q459 252 457 245
    L456 220 Q455 214 450 211 L430 200 Q424 195 418 199 L389 215
    Q380 220 369 220 Z`,
  source: {
    ...CC_BY_SA,
    name: 'Nasho3498 / Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Tempelhof_FE_2026.png',
  },
};

export const jarama: CircuitLayout = {
  eras: [[2026, 2026]],
  lengthKm: 3.934,
  turns: 14,
  direction: 'clockwise',
  d: `M166 335 C124 336 87 334 52 340 C40 343 36 326 47 317 L125 284
    Q136 279 145 285 L190 309 Q201 314 209 306 Q217 298 210 292 L188 274
    C180 269 186 257 193 260 L251 278 Q265 283 278 269 L345 196
    Q359 179 375 177 C405 174 415 169 430 153 L438 146
    C445 139 461 147 461 158 Q462 172 451 184 Q433 202 413 211 L347 235
    Q334 240 329 255 L319 285 Q316 291 312 296 C306 301 315 315 324 312
    Q339 308 349 297 L395 250 C407 238 429 253 422 264 L396 317
    Q389 333 369 334 L279 334 Q273 334 272 340 Q272 349 263 344 L251 337
    Q247 335 241 335 Z`,
  source: {
    ...CC_BY_SA,
    name: 'Nasho3498 / Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Jarama_FE_2026.png',
  },
};

export const saoPaulo: CircuitLayout = {
  eras: [
    [2023, 2023],
    [2025, 2025],
  ],
  lengthKm: 2.933,
  turns: 11,
  direction: 'clockwise',
  d: `M269 290 L75 313 Q69 314 68 308 L67 303 Q66 300 62 300 L51 302
    C41 304 38 290 47 288 C78 282 134 277 175 272 Q211 267 234 257
    Q241 254 244 260 Q248 270 252 269 Q255 268 256 259 Q258 251 266 248
    C306 233 399 204 457 186 Q462 184 461 190 L461 216 Q461 220 456 220
    L393 221 C364 221 342 226 324 233 Q317 236 317 245 L316 277
    Q316 282 312 283 Z`,
  source: {
    ...CC_BY_SA,
    name: 'Juan2910 / Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Sao_Paulo_Eprix_track.png',
  },
};

export const shanghai: CircuitLayout = {
  eras: [[2024, 2026]],
  lengthKm: 3.051,
  turns: 12,
  direction: 'clockwise',
  d: `M115 243 L171 96 C180 71 219 72 234 88 C251 101 244 126 228 132
    Q216 136 209 121 C201 105 185 108 182 121 C178 134 194 153 207 158
    Q213 161 226 158 L330 143 Q341 141 353 144 L440 166
    C454 170 456 180 446 184 Q421 196 394 194 L322 190
    C275 185 252 206 255 249 C255 279 289 301 289 328
    C289 344 269 363 251 364 Q239 365 222 358 Q212 354 202 359
    C166 379 136 396 106 402 Q101 403 100 397 L98 385 Q98 382 94 381
    L75 378 Q67 377 70 366 Q73 354 78 341 Z`,
  source: {
    name: 'Hello alpine / Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Shanghai_ePrix_circuit.png',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    changes: 'контур переведён в SVG',
  },
};
